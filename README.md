# GEE_Medium-wheat-fallow-management-zones-
An open Google Earth Engine workflow for delineating multi-year management zones in dryland wheat-fallow systems using free public data (Sentinel-2, USDA NASS CDL, POLARIS, PRISM).
# Wheat-Fallow Management Zone Analysis with Google Earth Engine

An open Google Earth Engine workflow for delineating multi-year management zones in dryland wheat-fallow systems using free public data (Sentinel-2, USDA NASS CDL, POLARIS, PRISM).

## What this project does

This workflow takes a single agricultural field as input and produces three outputs that a farmer or agronomist can act on:

1. **Mean NDVI map** — a multi-year composite showing where the field has consistently performed well or poorly during wheat growing seasons.
2. **Management zones** - a 4-class productivity classification (low / med-low / med-high / high) integrating NDVI, soil organic matter, clay content, elevation, and precipitation.
3. **Stability map** - distinguishes consistently productive areas (stable high), consistently underperforming areas (stable low), and weather-dependent areas (unstable). This last category often gets missed in standard management zone analyses but matters for input decisions.

The workflow is fully reproducible from a polygon and runs entirely in the browser through Google Earth Engine. No proprietary data, no licensed software, no downloads.

## Field used in this demo

- **Location:** Southwest Kansas, Gray County area (~37.65°N, 99.86°W)
- **Crop rotation:** Wheat-Fallow (winter wheat in 2019, 2021, 2023; fallow in 2020, 2022)
- **Rotation verified using USDA Cropland Data Layer class codes (24 = Winter Wheat, 61 = Fallow/Idle Cropland)**

Any agricultural field with a defined polygon can be analyzed by swapping the `geometry` input and adjusting the analysis years to match the dominant crop's phenology.

## Data sources

| Source | Use | Resolution |
|--------|-----|------------|
| Sentinel-2 MSI Level-1C Harmonized | NDVI computation | 10 m |
| USDA NASS Cropland Data Layer | Crop sequence verification | 30 m |
| POLARIS Soil Properties | Clay, organic matter, pH, sand, silt | 30 m |
| USGS SRTM | Elevation and slope | 30 m |
| PRISM (Oregon State) | Monthly precipitation | 800m |

All sources are freely accessible through Google Earth Engine.

## Workflow

The script `management_zones.js` runs in 12 sections:

1. Center map on the input polygon
2. Verify crop sequence with CDL
3. Pull Sentinel-2 imagery for each wheat year (April–June phenology window)
4. Mask clouds using QA60 band
5. Compute NDVI per year
6. Normalize NDVI to 0–1 scale per year
7. Compute multi-year mean and standard deviation
8. Pull terrain (SRTM) and soil (POLARIS) layers
9. Pull seasonal precipitation (PRISM)
10. Build a weighted productivity index (NDVI 0.5, OM 0.1, clay 0.1, precip 0.15, elev 0.15)
11. Classify into 4 management zones
12. Build the stability map

## How to run it

1. Open [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
2. Create a new script
3. Copy and paste the contents of `management_zones.js`
4. Draw a polygon over any agricultural field (use the rectangle tool)
5. Make sure the geometry variable is named `geometry`
6. Adjust analysis years in Section B if your field has a different rotation than wheat-fallow
7. Run

## Limitations

This workflow is for farmer by a crop consultant. This differes from field to field and year to year. Remember every field has a story.
- **NDVI ≠ yield.** Greenness correlates with biomass but yield depends on grain filling, harvest conditions, and management. Validate against ground truth where possible.
- **Sentinel-2 resolution (10–30 m)** captures patch-level variability but misses fine-scale heterogeneity.
- **POLARIS soil data is modeled**, not measured. For high-stakes decisions, ground-truth with actual soil samples.
- **PRISM precipitation is ~4 km resolution**, so within-field rainfall variation is essentially uniform.
- **The weighting scheme (0.5 / 0.1 / 0.1 / 0.15 / 0.15)** is a defensible starting point but not universal. Different cropping systems and climates may warrant different weights.
- **Polygon edges may include non-crop pixels** (roads, margins) that lower NDVI artificially. Tighter polygons improve results.

## References

- Doerge, T. (2000). Management zone concepts. *SSMG-2, PPI Site-Specific Management Guidelines*.
- Khosla, R. et al. (2002). Use of site-specific management zones to improve nitrogen management for precision agriculture. *Journal of Soil and Water Conservation*.
- Blackmore, S., Godwin, R.J., Fountas, S. (2003). The analysis of spatial and temporal trends in yield map data over six years. *Biosystems Engineering*, 84(4), 455–466. https://doi.org/10.1016/S1537-5110(03)00038-2
- USDA NASS Cropland Data Layer documentation: https://www.nass.usda.gov/Research_and_Science/Cropland/SARS1a.php
- POLARIS soil dataset: https://gee-community-catalog.org/projects/polaris/

## License

MIT — see [LICENSE](LICENSE) file. Use, modify, share freely with attribution.

## About

Built by **Sindhu Palla**, agronomist and geospatial researcher focused on precision agriculture.

- First-author paper: [Scientific Reports, Nature Portfolio, 2025](https://doi.org/10.1038/s41598-025-27174-8)

If you apply this workflow to a different region, crop, or scale, I would genuinely love to hear about it.
