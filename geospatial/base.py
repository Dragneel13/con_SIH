import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
from dataclasses import dataclass, field
from loguru import logger

try:
    import geopandas as gpd
    import rasterio
    from rasterio.mask import mask
    from rasterio.warp import calculate_default_transform, reproject, Resampling
    import shapely
    from shapely.geometry import shape, mapping, box
    import pyproj
    HAS_GIS = True
except ImportError:
    HAS_GIS = False

from geospatial.config import GeospatialConfig, DatasetConfig, get_default_config

@dataclass
class RasterMetadata:
    file_path: str
    crs: str
    width: int
    height: int
    count: int
    bounds: Tuple[float, float, float, float]
    resolution: Tuple[float, float]
    dtype: str
    nodata: Optional[float] = None
    valid_pixel_pct: float = 100.0

@dataclass
class VectorMetadata:
    file_path: str
    crs: str
    feature_count: int
    geometry_types: List[str]
    bounds: Tuple[float, float, float, float]
    is_valid: bool = True
    empty_count: int = 0

class AOIManager:
    """Manages study area boundary (AOI) loading, validation, and transformation."""
    
    def __init__(self, config: Optional[GeospatialConfig] = None):
        self.config = config or get_default_config()
        self.aoi_path = Path(self.config.aoi_path)
        self._gdf: Optional[Any] = None

    def load_aoi(self, target_crs: Optional[str] = None) -> Any:
        if not HAS_GIS:
            raise ImportError("GeoPandas/Shapely required for AOIManager.")
            
        if not self.aoi_path.exists():
            raise FileNotFoundError(f"AOI file not found at {self.aoi_path}")
            
        logger.info(f"Loading Area of Interest (AOI) from {self.aoi_path}")
        import fiona
        if not hasattr(fiona, 'path'):
            fiona.path = type('FionaPathModule', (), {'ParsedPath': getattr(fiona, '_ParsedPath', None)})
        try:
            gdf = gpd.read_file(self.aoi_path)
        except Exception:
            import json, shapely.geometry
            with open(self.aoi_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            geoms = [shapely.geometry.shape(feat['geometry']) for feat in data.get('features', []) if 'geometry' in feat]
            gdf = gpd.GeoDataFrame({'id': range(len(geoms))}, geometry=geoms, crs="EPSG:4326")
        
        if gdf.empty:
            raise ValueError(f"AOI dataset at {self.aoi_path} is empty.")
            
        # Ensure CRS is set
        if gdf.crs is None:
            logger.warning("AOI has no CRS set. Assuming EPSG:4326")
            gdf.set_crs("EPSG:4326", inplace=True)
            
        # Reproject if requested
        if target_crs and gdf.crs.to_string() != target_crs:
            logger.info(f"Reprojecting AOI from {gdf.crs.to_string()} to {target_crs}")
            gdf = gdf.to_crs(target_crs)
            
        self._gdf = gdf
        return gdf

    def get_bounds(self, crs: Optional[str] = None) -> Tuple[float, float, float, float]:
        gdf = self.load_aoi(target_crs=crs)
        bounds = gdf.total_bounds
        return (float(bounds[0]), float(bounds[1]), float(bounds[2]), float(bounds[3]))

class VectorIngestor:
    """Ingestion pipeline for spatial vector datasets (GeoJSON, Shapefile, GeoPackage)."""
    
    @staticmethod
    def load(file_path: Union[str, Path]) -> Any:
        if not HAS_GIS:
            raise ImportError("GeoPandas required for VectorIngestor.")
            
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Vector file does not exist: {path}")
            
        logger.info(f"Ingesting vector dataset: {path}")
        gdf = gpd.read_file(path)
        return gdf

    @staticmethod
    def extract_metadata(gdf: Any, file_path: str = "") -> VectorMetadata:
        if not HAS_GIS:
            raise ImportError("GeoPandas required for VectorIngestor.")
            
        crs_str = gdf.crs.to_string() if gdf.crs else "UNASSIGNED"
        geom_types = list(gdf.geometry.type.unique())
        bounds = tuple(float(x) for x in gdf.total_bounds)
        empty_cnt = int(gdf.geometry.is_empty.sum())
        is_valid = bool(gdf.geometry.is_valid.all() and empty_cnt == 0)
        
        return VectorMetadata(
            file_path=str(file_path),
            crs=crs_str,
            feature_count=len(gdf),
            geometry_types=geom_types,
            bounds=bounds,
            is_valid=is_valid,
            empty_count=empty_cnt
        )

    @staticmethod
    def validate_and_fix_geometries(gdf: Any) -> Any:
        if not HAS_GIS:
            raise ImportError("Shapely required for geometry validation.")
            
        gdf = gdf.copy()
        # Remove empty geometries
        gdf = gdf[~gdf.geometry.is_empty]
        # Fix invalid geometries
        if not gdf.geometry.is_valid.all():
            logger.warning("Invalid geometries detected in vector layer. Applying shapely.make_valid()")
            gdf['geometry'] = gdf.geometry.map(shapely.make_valid)
        return gdf

    @staticmethod
    def reproject_and_clip(gdf: Any, aoi_gdf: Any, target_crs: Optional[str] = None) -> Any:
        if not HAS_GIS:
            raise ImportError("GeoPandas required for reproject_and_clip.")
            
        # Ensure AOI and vector share target CRS
        effective_crs = target_crs or aoi_gdf.crs.to_string()
        
        if gdf.crs is None:
            logger.warning(f"Vector dataset has no CRS. Assigning {effective_crs}")
            gdf = gdf.set_crs(effective_crs)
        elif gdf.crs.to_string() != effective_crs:
            logger.info(f"Reprojecting vector dataset from {gdf.crs.to_string()} to {effective_crs}")
            gdf = gdf.to_crs(effective_crs)
            
        aoi_proj = aoi_gdf.to_crs(effective_crs) if aoi_gdf.crs.to_string() != effective_crs else aoi_gdf
        
        logger.info(f"Spatially clipping vector features to AOI boundary ({len(gdf)} input features)")
        mask_geom = aoi_proj.geometry.iloc[0] if len(aoi_proj) > 0 else aoi_proj
        clipped_gdf = gpd.clip(gdf, mask_geom)
        logger.info(f"Clipped result: {len(clipped_gdf)} features remaining")
        return clipped_gdf

class RasterIngestor:
    """Ingestion pipeline for spatial raster datasets (GeoTIFF, NetCDF)."""

    @staticmethod
    def extract_metadata(file_path: Union[str, Path]) -> RasterMetadata:
        if not HAS_GIS:
            raise ImportError("Rasterio required for RasterIngestor.")
            
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Raster file does not exist: {path}")
            
        with rasterio.open(path) as src:
            bounds = tuple(float(x) for x in src.bounds)
            res = (abs(float(src.transform.a)), abs(float(src.transform.e)))
            crs_str = src.crs.to_string() if src.crs else "UNASSIGNED"
            
            # Read sample array to evaluate valid pixel %
            sample = src.read(1, masked=True)
            valid_pct = float((sample.count() / sample.size) * 100.0)
            
            return RasterMetadata(
                file_path=str(path),
                crs=crs_str,
                width=src.width,
                height=src.height,
                count=src.count,
                bounds=bounds,
                resolution=res,
                dtype=str(src.dtypes[0]),
                nodata=float(src.nodata) if src.nodata is not None else None,
                valid_pixel_pct=valid_pct
            )

    @staticmethod
    def reproject_and_clip(
        file_path: Union[str, Path], 
        aoi_gdf: Any, 
        output_path: Optional[Union[str, Path]] = None,
        target_crs: Optional[str] = None
    ) -> Tuple[Any, Any]:
        """Reprojects and clips input raster to AOI polygon using Rasterio."""
        if not HAS_GIS:
            raise ImportError("Rasterio required for reproject_and_clip.")
            
        path = Path(file_path)
        with rasterio.open(path) as src:
            eff_crs = target_crs or src.crs.to_string()
            aoi_proj = aoi_gdf.to_crs(eff_crs)
            geoms = [mapping(geom) for geom in aoi_proj.geometry]
            
            # Mask/clip raster
            out_image, out_transform = mask(src, geoms, crop=True)
            out_meta = src.meta.copy()
            out_meta.update({
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform,
                "crs": eff_crs
            })
            
            if output_path:
                out_path = Path(output_path)
                out_path.parent.mkdir(parents=True, exist_ok=True)
                with rasterio.open(out_path, "w", **out_meta) as dest:
                    dest.write(out_image)
                logger.info(f"Exported clipped raster to {out_path}")
                
            return out_image, out_meta

class DatasetRegistry:
    """Scans and tracks operational/scientific dataset availability across the platform."""

    def __init__(self, config: Optional[GeospatialConfig] = None):
        self.config = config or get_default_config()

    def check_availability(self) -> Dict[str, Dict[str, Any]]:
        results = {}
        for key, ds in self.config.datasets.items():
            full_path = self.config.project_root / self.config.base_data_dir / ds.relative_path
            
            found_files = []
            if full_path.exists() and full_path.is_dir():
                found_files = [str(f.name) for f in full_path.iterdir() if f.is_file() and not f.name.startswith('.')]
            elif full_path.exists() and full_path.is_file():
                found_files = [str(full_path.name)]
                
            is_available = len(found_files) > 0
            status = "AVAILABLE" if is_available else ("UNAVAILABLE" if not ds.required else "MISSING_REQUIRED")
            
            results[key] = {
                "source_id": ds.source_id,
                "name": ds.name,
                "data_type": ds.data_type,
                "category": ds.category,
                "status": status,
                "found_files": found_files,
                "path": str(full_path),
                "notes": ds.notes
            }
            
            if status == "UNAVAILABLE":
                logger.warning(f"Dataset '{ds.name}' ({ds.source_id}) is UNAVAILABLE in {full_path}")
            else:
                logger.info(f"Dataset '{ds.name}' is {status}: {len(found_files)} files found.")
                
        return results
