
// Multiyear Wheat&Fallow management zone analysis
// Field:- Western Kansas (Gray County area, 37.65 N, -99.86 W)
// Crop sequence:- Wheat (2019, 2021, 2023), Fallow (2020, 2022)
// Verified via USDA Cropland Data Layer
// Data sources: Sentinel-2, USDA CDL, USGS SRTM, POLARIS, PRISM

Map.centerObject(geometry, 13);

// Section 1: Verify crops using USDA NASS CDL (Cropland data layer)

var years = [2019, 2020, 2021, 2022, 2023];
years.forEach(function(year) {
  var cdl = ee.ImageCollection('USDA/NASS/CDL')
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .first()
    .select('cropland');
  var mode = cdl.reduceRegion({
    reducer: ee.Reducer.mode(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9
  });
  print('crop class in ' + year + ':', mode);
});

// Section 2: Sentinel2 imagery for wheat years (April to June)
var image2019 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
  .filterBounds(geometry)
  .filterDate("2019-04-01", "2019-06-30")
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

var image2021 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
  .filterBounds(geometry)
  .filterDate("2021-04-01", "2021-06-30")
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

var image2023 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
  .filterBounds(geometry)
  .filterDate("2023-04-01", "2023-06-30")
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

print('wheat 2019 images:', image2019.size());
print('wheat 2021 images:', image2021.size());
print('wheat 2023 images:', image2023.size());

// Section 3: Cloud mask 

function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image.updateMask(mask).divide(10000);
}
// Section 4: Compute NDVI per wheat year

var nirBand = "B8";
var redBand = "B4";

var ndvi2019 = image2019.map(maskS2clouds).median()
  .normalizedDifference([nirBand, redBand]).clip(geometry);
var ndvi2021 = image2021.map(maskS2clouds).median()
  .normalizedDifference([nirBand, redBand]).clip(geometry);
var ndvi2023 = image2023.map(maskS2clouds).median()
  .normalizedDifference([nirBand, redBand]).clip(geometry);

var ndviVis = {min: 0, max: 1,
  palette: ['red', 'orange', 'yellow', 'green', 'darkgreen']};
Map.addLayer(ndvi2019, ndviVis, 'NDVI wheat 2019');
Map.addLayer(ndvi2021, ndviVis, 'NDVI wheat 2021');
Map.addLayer(ndvi2023, ndviVis, 'NDVI wheat 2023');

// Section 5: Normalize NDVI per year (0-1 scaling)

function normalize(image) {
  var band = image.bandNames().get(0);
  var stats = image.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: geometry,
    scale: 30,
    maxPixels: 1e9
  });
  var min = ee.Number(stats.get(ee.String(band).cat("_min")));
  var max = ee.Number(stats.get(ee.String(band).cat("_max")));
  return image.subtract(min).divide(max.subtract(min)).toFloat();
}

var norm2019 = normalize(ndvi2019);
var norm2021 = normalize(ndvi2021);
var norm2023 = normalize(ndvi2023);

print("Normalization done");

// Section 6: Multi-year mean and standard deviation 
var ndviStack = ee.ImageCollection([norm2019, norm2021, norm2023]);
var mean_ndvi = ndviStack.mean().rename("Mean_NDVI");
var std_ndvi = ndviStack.reduce(ee.Reducer.stdDev()).rename("Std_NDVI");

Map.addLayer(mean_ndvi, ndviVis, 'Mean NDVI');

// Section 7: Terrain and soil (POLARIS) layers


var dem = ee.Image('USGS/SRTMGL1_003').clip(geometry);
var slope = ee.Terrain.slope(dem).clip(geometry);
var elevation = dem.select('elevation');

var clay = ee.ImageCollection('projects/sat-io/open-datasets/polaris/clay_mean').first().clip(geometry);
var om   = ee.ImageCollection('projects/sat-io/open-datasets/polaris/om_mean').first().clip(geometry);
var ph   = ee.ImageCollection('projects/sat-io/open-datasets/polaris/ph_mean').first().clip(geometry);
var sand = ee.ImageCollection('projects/sat-io/open-datasets/polaris/sand_mean').first().clip(geometry);
var silt = ee.ImageCollection('projects/sat-io/open-datasets/polaris/silt_mean').first().clip(geometry);

Map.addLayer(elevation, {min: 750, max: 930, palette: ['green','yellow','brown']}, 'Elevation', false);
Map.addLayer(slope, {min: 0, max: 5, palette: ['green','yellow','red']}, 'Slope', false);
Map.addLayer(clay, {min: 15, max: 25, palette: ['sandybrown','sienna']}, 'Clay %', false);
Map.addLayer(om, {min: 0.1, max: 0.2, palette: ['lightyellow','saddlebrown']}, 'Organic Matter', false);
Map.addLayer(sand, {min: 20, max: 70, palette: ['sienna','sandybrown']}, 'Sand %', false);
Map.addLayer(ph, {min: 5, max: 8, palette: ['red','yellow','blue']}, 'Soil pH', false);
Map.addLayer(silt, {min: 10, max: 50, palette: ['lightyellow','gray']}, 'Silt %', false);

// Section 8: PRISM precipitation

var precip2019 = ee.ImageCollection('OREGONSTATE/PRISM/AN81m')
  .filterDate('2019-04-01','2019-06-30').select('ppt').sum().clip(geometry);
var precip2021 = ee.ImageCollection('OREGONSTATE/PRISM/AN81m')
  .filterDate('2021-04-01','2021-06-30').select('ppt').sum().clip(geometry);
var precip2023 = ee.ImageCollection('OREGONSTATE/PRISM/AN81m')
  .filterDate('2023-04-01','2023-06-30').select('ppt').sum().clip(geometry);

var meanPrecip = ee.ImageCollection([precip2019, precip2021, precip2023]).mean();

Map.addLayer(meanPrecip, {min: 0, max: 300, palette: ['white','blue','cyan','purple']}, 'Mean Precipitation', false);

// Section 9: Normalize soil/terrain/precip layers

var normClay   = normalize(clay);
var normOM     = normalize(om);
var normElev   = normalize(elevation);
var normPrecip = normalize(meanPrecip);

// Section 10: Weighted index

var productivity = mean_ndvi.multiply(0.5)
  .add(normOM.multiply(0.1))
  .add(normClay.multiply(0.1))
  .add(normPrecip.multiply(0.15))
  .add(normElev.multiply(0.15));

var prodNorm = normalize(productivity);


// Section 11: Classify into 4 management zones

var zones = prodNorm
  .where(prodNorm.lte(0.25), 1)
  .where(prodNorm.gt(0.25).and(prodNorm.lte(0.5)), 2)
  .where(prodNorm.gt(0.5).and(prodNorm.lte(0.75)), 3)
  .where(prodNorm.gt(0.75), 4)
  .clip(geometry)
  .rename("Zone");

Map.addLayer(zones, {min: 1, max: 4,
  palette: ['red', 'orange', 'lightgreen', 'darkgreen']},
  'Management Zones');

// Section 12: Stability map
// Mean high + low variance = stable productive (3)
// Mean low + low variance = stable underperforming (1)
// High variance = unstable (2)


var stability = ee.Image(0)
  .where(mean_ndvi.gt(0.5).and(std_ndvi.lt(0.15)), 3)
  .where(mean_ndvi.lte(0.5).and(std_ndvi.lt(0.15)), 1)
  .where(std_ndvi.gte(0.15), 2)
  .clip(geometry)
  .rename('Stability');

Map.addLayer(stability, {min: 1, max: 3, palette: ['red','yellow','green']},
  'Stability Map');


// Mean NDVI legend
var legend1 = ui.Panel({style: {position: 'top-left'}});
legend1.add(ui.Label('Mean NDVI', {fontWeight: 'bold'}));
['red:0 - 0.2 Very Low','orange:0.2 - 0.4 Low','yellow:0.4 - 0.6 Medium',
 'green:0.6 - 0.8 High','darkgreen:0.8 - 1.0 Very High']
.forEach(function(item) {
  var parts = item.split(':');
  var row = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal')});
  row.add(ui.Label('', {backgroundColor: parts[0], padding: '10px', margin: '4px'}));
  row.add(ui.Label(parts[1]));
  legend1.add(row);
});
Map.add(legend1);

// Management Zones legend
var legend2 = ui.Panel({style: {position: 'bottom-left'}});
legend2.add(ui.Label('Management Zones', {fontWeight: 'bold'}));
['red:Zone 1 - Low','orange:Zone 2 - Med Low',
 'lightgreen:Zone 3 - Med High','darkgreen:Zone 4 - High']
.forEach(function(item) {
  var parts = item.split(':');
  var row = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal')});
  row.add(ui.Label('', {backgroundColor: parts[0], padding: '10px', margin: '4px'}));
  row.add(ui.Label(parts[1]));
  legend2.add(row);
});
Map.add(legend2);

// Stability legend
var legend3 = ui.Panel({style: {position: 'bottom-right'}});
legend3.add(ui.Label('Stability Map', {fontWeight: 'bold'}));
['red:Stable Low','yellow:Unstable','green:Stable High']
.forEach(function(item) {
  var parts = item.split(':');
  var row = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal')});
  row.add(ui.Label('', {backgroundColor: parts[0], padding: '10px', margin: '4px'}));
  row.add(ui.Label(parts[1]));
  legend3.add(row);
});
Map.add(legend3);


// References
// Management zones: Fridgen, J.J., https://doi.org/10.2134/agronj2004.1000
// Spatial classification: Kitchen N.R., https://doi.org/10.1016/j.compag.2004.11.012
// Stability mapping: Blackmore et al. (2003), https://doi.org/10.1016/S1537-5110(03)00038-2
// CDL: USDA NASS Cropland Data Layer
// POLARIS: gee-community-catalog.org/projects/polaris
