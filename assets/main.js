'use strict';

var COLORS = {
  WHITE: 0xFFFFFF,
  BLACK: 0x101010
};

BrainBrowser.SurfaceViewer.start('brainbrowser', handleBrainz);

// Pulled out this function from the start call so that it's not so nested.
function handleBrainz(viewer) {
  var inputs = queryStringToHash();

  // Start rendering the scene.
  viewer.render();
  viewer.setClearColor(COLORS.WHITE);
  viewer.addEventListener('loadconfig', function(config){
    setupGui(viewer, config);
    loadData(viewer, config);
  })

  if(inputs.config){
    BrainBrowser.loader.loadFromURL(inputs.config, function(response){
      viewer.triggerEvent('loadconfig', JSON.parse(response));
    });
  } else {
    viewer.triggerEvent('loadconfig', makeDefaultConfigFromInputs(inputs));
  }
}

function loadData(viewer, config){

  var colorMapIndex = 0;

  viewer.addEventListener('displaymodel', function(brainBrowserModel) {

    config.encoding.intensity.forEach(function(intensityData){
      if(brainBrowserModel.model_data.name === intensityData.field){
        viewer.loadIntensityDataSetFromURL(intensityData.location, {
          format: intensityData.format ||  getFileExtension(intensityData.location),
          model_name: brainBrowserModel.model_data.name,
          parse: intensityData.options
        });
      }

    });
  });

  config.data.forEach(function(model){

    viewer.loadModelFromURL(model.location, {
      format: model.format || getFileExtension(model.location)
    });

  });

  viewer.addEventListener("loadcolormap", function(event) {
    viewer.color_map.clamp = false; 
  });

  if(config.colorMap){
    colorMapIndex = BrainBrowser.config.get("color_maps")
      .findIndex(function(map){
        return map.name == config.colorMap
      });
  }

  viewer.loadColorMapFromURL(BrainBrowser.config.get("color_maps")[colorMapIndex].url);
}

function setupGui(viewer, config){
  var gui = new dat.GUI();

  var THREE = BrainBrowser.SurfaceViewer.THREE;

  viewer.addEventListener('displaymodel', function(brainBrowserModel) {

    brainBrowserModel.new_shapes.forEach(function(shape){

      if(shape.type === 'Mesh'){

        shape.material = new THREE.MeshLambertMaterial( {
          color: COLORS.WHITE,
          ambient: COLORS.WHITE,
          specular: COLORS.BLACK,
          vertexColors: THREE.VertexColors
        });
        
      }

      var shapeGui = gui.addFolder(brainBrowserModel.model_data.name);
      shapeGui
        .add(shape.material, 'opacity',0,1)
        .onChange(function(newT){
          viewer.setTransparency(newT, {shape_name: shape.name})
        });

      shapeGui.open();
    });

  });

  // TODO handle individual color maps.
  viewer.addEventListener("loadintensitydata", function(event) {
    var model_data = event.model_data;
    var intensity_data = event.intensity_data;

    var overlayGui = gui.__folders[model_data.name].addFolder(intensity_data.name);
    overlayGui.open();

    var vmin = overlayGui.add(intensity_data, 'min');
    var vmax = overlayGui.add(intensity_data, 'max');

    vmin.onChange(function(newMin){
      viewer.setIntensityRange(intensity_data, newMin, intensity_data.max)
    });
    vmax.onChange(function(newMax){
      viewer.setIntensityRange(intensity_data, intensity_data.min, newMax)
    });

  });
}

function makeDefaultConfigFromInputs(inputs){
  var modelUrl = inputs.model || './models/vtk/rh_freesurfer_curvature.vtk'
  var overlayUrl = inputs.overlay || './models/rh_vertices.csv'

  var viewerConfig = {
    data: [{
      location: modelUrl
    }],
    encoding: {
      intensity: [{
        location: overlayUrl,
        field: modelUrl.split('/').pop(),
        options: {
          columns: ['freesurfer convexity (sulc)', 'freesurfer thickness', 'freesurfer curvature']
        }
      }]
    }
  };
}

function getFileExtension(fileLocation){
  return fileLocation.substr(fileLocation.lastIndexOf('.') + 1);
}

// taken from https://css-tricks.com/snippets/jquery/get-query-params-object/
function queryStringToHash(str){
  return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
}