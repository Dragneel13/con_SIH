import pytest
import numpy as np
from pathlib import Path
from tempfile import TemporaryDirectory
import json

from geospatial.config import get_default_config, GeospatialConfig
from geospatial.base import (
    AOIManager, 
    VectorIngestor, 
    RasterIngestor, 
    DatasetRegistry, 
    VectorMetadata, 
    RasterMetadata
)
from geospatial.sentinel2.ingestor import Sentinel2Ingestor
from geospatial.sentinel1.ingestor import Sentinel1Ingestor
from geospatial.dem.ingestor import DEMIngestor
from geospatial.geology.ingestor import GeologyIngestor
from geospatial.occurrences.ingestor import OccurrencesIngestor

try:
    import geopandas as gpd
    from shapely.geometry import Polygon, Point, box
    import rasterio
    from rasterio.transform import from_origin
    HAS_GIS = True
except ImportError:
    HAS_GIS = False

# 1. Test AOI Loading and CRS Normalization
@pytest.mark.skipif(not HAS_GIS, reason="GeoPandas/Rasterio required for GIS tests")
def test_aoi_manager_load_and_crs():
    config = get_default_config()
    aoi_mgr = AOIManager(config)
    
    # Load AOI in EPSG:4326
    gdf_4326 = aoi_mgr.load_aoi(target_crs="EPSG:4326")
    assert gdf_4326.crs.to_string() == "EPSG:4326"
    assert len(gdf_4326) == 1
    
    # Load AOI reprojected to UTM Zone 44N (EPSG:32643)
    gdf_32643 = aoi_mgr.load_aoi(target_crs="EPSG:32643")
    assert gdf_32643.crs.to_string() == "EPSG:32643"
    
    bounds = aoi_mgr.get_bounds(crs="EPSG:4326")
    assert bounds[0] == pytest.approx(79.50)
    assert bounds[2] == pytest.approx(80.60)

# 2. Test Vector Loading, Geometry Validation, and AOI Clipping
@pytest.mark.skipif(not HAS_GIS, reason="GeoPandas/Shapely required")
def test_vector_ingestor_load_and_clip():
    with TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir) / "sample_pts.geojson"
        
        geojson_str = json.dumps({
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {"id": 1}, "geometry": {"type": "Point", "coordinates": [80.0, 21.8]}},
                {"type": "Feature", "properties": {"id": 2}, "geometry": {"type": "Point", "coordinates": [80.2, 21.9]}},
                {"type": "Feature", "properties": {"id": 3}, "geometry": {"type": "Point", "coordinates": [75.0, 15.0]}}
            ]
        })
        with open(tmp_path, 'w', encoding='utf-8') as f:
            f.write(geojson_str)
        
        # Ingest and validate metadata
        loaded_gdf = VectorIngestor.load(tmp_path)
        meta = VectorIngestor.extract_metadata(loaded_gdf, str(tmp_path))
        assert meta.feature_count == 3
        assert meta.crs == "EPSG:4326"
        assert meta.is_valid is True
        
        # Fix geometries
        validated_gdf = VectorIngestor.validate_and_fix_geometries(loaded_gdf)
        assert len(validated_gdf) == 3
        
        # Clip to AOI
        aoi_mgr = AOIManager()
        aoi_gdf = aoi_mgr.load_aoi(target_crs="EPSG:4326")
        clipped_gdf = VectorIngestor.reproject_and_clip(validated_gdf, aoi_gdf)
        assert len(clipped_gdf) == 2  # Only 2 points inside AOI

# 3. Test Raster Loading, Metadata Extraction, and Clipping
@pytest.mark.skipif(not HAS_GIS, reason="Rasterio required")
def test_raster_ingestor_load_metadata_clip():
    with TemporaryDirectory() as tmp_dir:
        tmp_tif = Path(tmp_dir) / "test_raster.tif"
        
        # Generate synthetic 100x100 raster in WGS84 over Balaghat
        transform = from_origin(79.5, 22.1, 0.01, 0.01)
        data = np.ones((1, 100, 100), dtype=np.float32) * 250.0
        
        with rasterio.open(
            tmp_tif, 'w',
            driver='GTiff',
            height=100, width=100,
            count=1, dtype=data.dtype,
            crs='EPSG:4326', transform=transform,
            nodata=-9999.0
        ) as dst:
            dst.write(data)
            
        # Metadata extraction
        meta = RasterIngestor.extract_metadata(tmp_tif)
        assert meta.width == 100
        assert meta.height == 100
        assert meta.crs == "EPSG:4326"
        assert meta.nodata == -9999.0
        assert meta.valid_pixel_pct == pytest.approx(100.0)
        
        # Reproject and Clip
        aoi_mgr = AOIManager()
        aoi_gdf = aoi_mgr.load_aoi(target_crs="EPSG:4326")
        clipped_img, clipped_meta = RasterIngestor.reproject_and_clip(tmp_tif, aoi_gdf)
        assert clipped_img.shape[0] == 1
        assert clipped_meta["driver"] == "GTiff"

# 4. Test Missing Dataset Handling (UNAVAILABLE Reporting)
def test_dataset_registry_missing_handling():
    config = get_default_config()
    registry = DatasetRegistry(config)
    results = registry.check_availability()
    
    # Verify default state when raw datasets have no files
    assert "sentinel2" in results
    assert results["sentinel2"]["status"] == "UNAVAILABLE"
    assert results["sentinel1"]["status"] == "UNAVAILABLE"
    assert results["dem"]["status"] == "UNAVAILABLE"
    assert results["geology"]["status"] == "UNAVAILABLE"
    assert results["occurrences"]["status"] == "UNAVAILABLE"

def test_modular_ingestors_unavailable_reporting():
    # Sentinel-2
    s2_ingestor = Sentinel2Ingestor()
    res_s2 = s2_ingestor.process()
    assert res_s2["status"] == "UNAVAILABLE"
    assert res_s2["files_count"] == 0

    # Sentinel-1
    s1_ingestor = Sentinel1Ingestor()
    res_s1 = s1_ingestor.process()
    assert res_s1["status"] == "UNAVAILABLE"
    assert res_s1["files_count"] == 0

    # DEM
    dem_ingestor = DEMIngestor()
    res_dem = dem_ingestor.process()
    assert res_dem["status"] == "UNAVAILABLE"

    # Geology
    geo_ingestor = GeologyIngestor()
    res_geo = geo_ingestor.process()
    assert res_geo["status"] == "UNAVAILABLE"

    # Occurrences
    occ_ingestor = OccurrencesIngestor()
    res_occ = occ_ingestor.process()
    assert res_occ["status"] == "UNAVAILABLE"
