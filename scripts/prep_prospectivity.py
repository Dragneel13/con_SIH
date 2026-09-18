import os
import sys
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, LineString, Polygon, box
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_bounds
from scipy.spatial import cKDTree

def print_log(msg):
    print(msg, flush=True)

def main():
    base_dir = os.path.abspath(os.curdir)
    processed_dir = os.path.join(base_dir, 'processed')
    features_dir = os.path.join(base_dir, 'features')
    reports_dir = os.path.join(base_dir, 'reports')
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(features_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    print_log("=== STEP 2 & 3: Prospectivity Preprocessing & Feature Engineering ===")

    # 1. Study Area Bounds & Target Grid Definition (EPSG:4326)
    # Bounding Box: [79.60, 21.60, 80.30, 22.05]
    # Pixel resolution: 0.002 degrees (~200m)
    minx, miny, maxx, maxy = 79.60, 21.60, 80.30, 22.05
    res = 0.002
    width = int(np.round((maxx - minx) / res))
    height = int(np.round((maxy - miny) / res))
    dst_transform = from_bounds(minx, miny, maxx, maxy, width, height)
    dst_crs = 'EPSG:4326'

    print_log(f"Study Area Grid: {width} x {height} pixels ({width * height} cells) at resolution {res} deg (~200m)")
    print_log(f"Bounds: [{minx}, {miny}, {maxx}, {maxy}]")

    # Helper function to reproject raster into target grid
    def resample_raster(raster_path, band_indices=[1]):
        with rasterio.open(raster_path) as src:
            bands_data = []
            for b_idx in band_indices:
                destination = np.zeros((height, width), dtype=np.float32)
                reproject(
                    source=rasterio.band(src, b_idx),
                    destination=destination,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=dst_transform,
                    dst_crs=dst_crs,
                    resampling=Resampling.bilinear
                )
                bands_data.append(destination)
            return bands_data

    # --- Feature 1: DEM Terrain Features ---
    dem_path = os.path.join(base_dir, 'raw', 'dem', 'output_SRTMGL1.tif')
    print_log(f"Processing DEM raster: {dem_path}")
    dem_grid = resample_raster(dem_path, [1])[0]
    
    # Fill nodata/missing DEM values if any using spatial nanmean without boundary distortion
    dem_grid = np.where((dem_grid < -100) | np.isnan(dem_grid), np.nan, dem_grid)
    valid_mean = np.nanmean(dem_grid) if not np.isnan(np.nanmean(dem_grid)) else 300.0
    dem_grid = np.nan_to_num(dem_grid, nan=valid_mean)

    # Compute Slope and Aspect
    gy, gx = np.gradient(dem_grid, res * 111000) # Grid spacing approx in meters
    slope_grid = np.degrees(np.arctan(np.sqrt(gx**2 + gy**2)))
    aspect_grid = np.degrees(np.arctan2(-gx, gy)) % 360

    # --- Feature 2: Sentinel-1 Radar ---
    s1_path = os.path.join(base_dir, 'raw', 'sentinel1', 'MIRPS_Sentinel1_2021_2026-0000000000-0000000000.tif')
    print_log(f"Processing Sentinel-1 SAR raster: {s1_path}")
    s1_vv, s1_vh = resample_raster(s1_path, [1, 2])
    # Convert dB to linear power scale before ratio: s1_ratio = 10**((s1_vv - s1_vh) / 10.0)
    s1_ratio = np.power(10.0, np.clip((s1_vv - s1_vh) / 10.0, -3.0, 3.0))

    # --- Feature 3: Sentinel-2 Multispectral & Spectral Indices ---
    s2_dir = os.path.join(base_dir, 'raw', 'sentinel2')
    print_log(f"Processing Sentinel-2 JP2 bands from: {s2_dir}")
    b02 = resample_raster(os.path.join(s2_dir, 'T44QMK_20251203T051059_B02_10m.jp2'), [1])[0]
    b03 = resample_raster(os.path.join(s2_dir, 'T44QMK_20251203T051059_B03_10m.jp2'), [1])[0]
    b04 = resample_raster(os.path.join(s2_dir, 'T44QMK_20251203T051059_B04_10m.jp2'), [1])[0]
    b08 = resample_raster(os.path.join(s2_dir, 'T44QMK_20251203T051059_B08_10m.jp2'), [1])[0]
    b11 = resample_raster(os.path.join(s2_dir, 'T44QMK_20251203T051059_B11_20m.jp2'), [1])[0]
    b12 = resample_raster(os.path.join(s2_dir, 'T44QMK_20251203T051059_B12_20m.jp2'), [1])[0]

    ndvi = np.where((b08 + b04) != 0, (b08 - b04) / (b08 + b04 + 1e-5), 0)
    ndbi = np.where((b11 + b08) != 0, (b11 - b08) / (b11 + b08 + 1e-5), 0)
    ndwi = np.where((b03 + b08) != 0, (b03 - b08) / (b03 + b08 + 1e-5), 0)
    clay_index = np.where((b12 + 1e-5) > 0, b11 / (b12 + 1e-5), 0)
    ferrous_index = np.where((b08 + 1e-5) > 0, b11 / (b08 + 1e-5), 0)

    # --- Feature 4: Landsat 8-9 Multispectral ---
    ls_path = os.path.join(base_dir, 'raw', 'landstat', 'MIRPS_Landsat8_9_2013_2026.tif')
    print_log(f"Processing Landsat 8-9 raster: {ls_path}")
    ls_b1, ls_b2, ls_b3, ls_b4, ls_b5 = resample_raster(ls_path, [1, 2, 3, 4, 5])

    # --- Feature 5: Weather & SMAP ---
    smap_path = os.path.join(base_dir, 'raw', 'weather', 'MIRPS_SMAP_SoilMoisture_2021_2026.tif')
    rain_path = os.path.join(base_dir, 'raw', 'weather', 'rainfall.tif')
    print_log(f"Processing Weather rasters: {smap_path}, {rain_path}")
    soil_moisture = resample_raster(smap_path, [1])[0]
    rainfall = resample_raster(rain_path, [1])[0]

    # --- Feature 6: Accessibility Distance ---
    roads_path = os.path.join(base_dir, 'raw', 'accessibility', 
                              'Balaghat_Accessibility_Roads_geojson_uid_f32a03b1-e89f-4f21-8355-f32ba511eb2b', 
                              'Balaghat_Accessibility_Roads.geojson')
    print_log(f"Processing Road Distance from: {roads_path}")
    import json
    with open(roads_path, 'r', encoding='utf-8') as f:
        roads_geojson = json.load(f)
    
    # Extract road coordinates for KDTree distance computation
    road_pts = []
    for feat in roads_geojson.get('features', []):
        geom = feat.get('geometry')
        if geom:
            coords = geom.get('coordinates', [])
            gtype = geom.get('type')
            if gtype == 'LineString':
                road_pts.extend(coords)
            elif gtype == 'MultiLineString':
                for line in coords:
                    road_pts.extend(line)
            elif gtype == 'Point':
                road_pts.append(coords)
    
    if len(road_pts) == 0:
        road_pts = [[80.0, 21.8]] # Safe fallback
    road_tree = cKDTree(np.array(road_pts))

    # --- Feature 7: Geochemistry & Mineral Occurrence Distances ---
    gdb_path = os.path.join(base_dir, 'raw', 'mineral_occurences', 'MnOccurrence', 
                            'Exploration_Data_20260805160119_48_GIS_FILE_20260907000836125', 
                            'CRO-24228-2024', 'GIS_FILES', '20260805160119.48_GIS FILE', 'GIS FILE', 
                            'NGDR_LSM_schema_FSP ID 49367', 'Schema_DM_LSM.gdb')
    print_log(f"Processing Mineral Occurrences from GDB: {gdb_path}")
    import fiona
    if not hasattr(fiona, 'path'):
        fiona.path = type('FionaPathModule', (), {'ParsedPath': getattr(fiona, '_ParsedPath', None)})

    min_line_pts = []
    try:
        with fiona.open(gdb_path, layer='Mineralization_Line_LSM') as src:
            for feat in src:
                geom = feat.get('geometry')
                if geom:
                    coords = geom.get('coordinates', [])
                    gtype = geom.get('type')
                    if gtype == 'LineString':
                        min_line_pts.extend([(c[0], c[1]) for c in coords])
                    elif gtype == 'MultiLineString':
                        for line in coords:
                            min_line_pts.extend([(c[0], c[1]) for c in line])
                    elif gtype == 'Point':
                        min_line_pts.append((coords[0], coords[1]))
    except Exception as e:
        print_log(f"Warning reading GDB lines: {e}. Using default mineral line coordinates.")

    if len(min_line_pts) == 0:
        min_line_pts = [[80.72, 21.84], [79.82, 21.91], [79.92, 21.68]] # Fallback known coordinates
    min_line_tree = cKDTree(np.array(min_line_pts))

    # Load Geochemistry Excel
    excel_chem_path = os.path.join(base_dir, 'raw', 'geochemistry', 'original_geochemistry_file.xlsx')
    df_chem_xl = pd.read_excel(excel_chem_path)
    # Extract coordinates and MnO %
    df_chem_xl = df_chem_xl.dropna(subset=['Latitude (DD)', 'Longitude (DD)', 'MnO (%)'])
    chem_coords = df_chem_xl[['Longitude (DD)', 'Latitude (DD)']].values
    chem_mno = df_chem_xl['MnO (%)'].values
    chem_tree = cKDTree(chem_coords)

    # --- Flatten Grid Coordinates into Feature Table ---
    cols_idx = np.arange(width)
    rows_idx = np.arange(height)
    mesh_cols, mesh_rows = np.meshgrid(cols_idx, rows_idx)

    # Transform mesh grid indices to EPSG:4326 coords
    xs, ys = rasterio.transform.xy(dst_transform, mesh_rows, mesh_cols)
    xs = np.array(xs)
    ys = np.array(ys)

    grid_pts = np.column_stack([xs.ravel(), ys.ravel()])
    print_log(f"Computing spatial distance features for {len(grid_pts)} grid cells...")

    # Calculate distance to roads (convert degrees to km approx * 111)
    dist_roads_deg, _ = road_tree.query(grid_pts, k=1)
    dist_roads_km = dist_roads_deg * 111.0

    # Calculate distance to mapped mineralization lines
    dist_min_line_deg, _ = min_line_tree.query(grid_pts, k=1)
    dist_min_line_km = dist_min_line_deg * 111.0

    # Calculate distance to nearest geochemistry sample & interpolated MnO concentration
    dist_chem_deg, chem_idx = chem_tree.query(grid_pts, k=1)
    nearest_mno = chem_mno[chem_idx]
    dist_chem_km = dist_chem_deg * 111.0

    # Compute Spatial Block IDs (5x5 spatial grid) to prevent spatial data leakage during ML split
    num_blocks_x = 5
    num_blocks_y = 5
    block_x = np.clip(np.floor((xs.ravel() - minx) / (maxx - minx) * num_blocks_x), 0, num_blocks_x - 1).astype(int)
    block_y = np.clip(np.floor((ys.ravel() - miny) / (maxy - miny) * num_blocks_y), 0, num_blocks_y - 1).astype(int)
    spatial_block_id = block_y * num_blocks_x + block_x

    # --- Construct Target Labels (Occurrence vs Background) ---
    # Positive label (Class 1): Within 300m (0.3 km) of mapped mineralization lines OR nearest geochemistry sample has MnO > 5% within 1km
    is_positive = (dist_min_line_km <= 0.3) | ((dist_chem_km <= 1.0) & (nearest_mno >= 5.0))

    # Background label (Class 0): At least 2.0 km away from positive mineralization lines and geochemistry samples
    is_background = (dist_min_line_km >= 2.0) & (dist_chem_km >= 2.0)

    labels = np.full(len(grid_pts), fill_value=-1, dtype=int)
    labels[is_positive] = 1
    labels[is_background] = 0

    print_log(f"Extracted Ground-truth Occurrence Labels:\n Positives (1): {np.sum(labels == 1)}\n Pseudo-Absence Background (0): {np.sum(labels == 0)}\n Unlabeled Spatial Cells: {np.sum(labels == -1)}")

    # Assemble Complete Feature DataFrame
    df_features = pd.DataFrame({
        'longitude': xs.ravel(),
        'latitude': ys.ravel(),
        'row_idx': mesh_rows.ravel(),
        'col_idx': mesh_cols.ravel(),
        'spatial_block_id': spatial_block_id,
        'target_occurrence': labels,
        
        # Terrain
        'elevation': dem_grid.ravel(),
        'slope': slope_grid.ravel(),
        'aspect': aspect_grid.ravel(),
        
        # Sentinel-1 SAR
        's1_vv': s1_vv.ravel(),
        's1_vh': s1_vh.ravel(),
        's1_ratio': s1_ratio.ravel(),
        
        # Sentinel-2 Spectral
        'b02_blue': b02.ravel(),
        'b03_green': b03.ravel(),
        'b04_red': b04.ravel(),
        'b08_nir': b08.ravel(),
        'b11_swir1': b11.ravel(),
        'b12_swir2': b12.ravel(),
        'ndvi': ndvi.ravel(),
        'ndbi': ndbi.ravel(),
        'ndwi': ndwi.ravel(),
        'clay_index': clay_index.ravel(),
        'ferrous_index': ferrous_index.ravel(),
        
        # Landsat 8-9
        'landsat_b1': ls_b1.ravel(),
        'landsat_b2': ls_b2.ravel(),
        'landsat_b3': ls_b3.ravel(),
        'landsat_b4': ls_b4.ravel(),
        'landsat_b5': ls_b5.ravel(),
        
        # Weather / Soil
        'soil_moisture': soil_moisture.ravel(),
        'rainfall': rainfall.ravel(),
        
        # Distances & Geochemistry
        'dist_roads_km': dist_roads_km,
        'dist_min_line_km': dist_min_line_km,
        'dist_chem_km': dist_chem_km,
        'nearest_mno_pct': nearest_mno
    })

    # Filter invalid/out-of-bounds rows if necessary
    df_features = df_features.dropna()

    out_csv = os.path.join(features_dir, 'prospectivity_features.csv')
    df_features.to_csv(out_csv, index=False)
    print_log(f"Successfully saved prospectivity feature table to {out_csv} ({len(df_features)} rows)")

    # Save aligned GeoTIFF rasters under processed/
    processed_dem = os.path.join(processed_dir, 'dem_aligned.tif')
    with rasterio.open(
        processed_dem, 'w', driver='GTiff',
        height=height, width=width, count=1, dtype=dem_grid.dtype,
        crs=dst_crs, transform=dst_transform
    ) as dst:
        dst.write(dem_grid, 1)
    print_log(f"Saved processed DEM raster to {processed_dem}")

if __name__ == '__main__':
    main()
