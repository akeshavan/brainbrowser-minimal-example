'use strict';

var COLORS = {
  WHITE: 0xFFFFFF,
  BLACK: 0x101010
};

var colormaps = {}
BrainBrowser.config.get("color_maps").forEach(function(val, idx, arr){colormaps[val.name] = val.url})

var target = document.getElementById('brainbrowser')

BrainBrowser.SurfaceViewer.start('brainbrowser', handleBrainz);

// Pulled out this function from the start call so that it's not so nested.
function handleBrainz(viewer) {

  var inputs = queryStringToHash();

  // Start rendering the scene.
  window.viewer = viewer
  viewer.render();
  viewer.setClearColor(COLORS.WHITE);
  viewer.addEventListener('loadconfig', function(config){
    setupGui(viewer, config);
    loadData(viewer, config);
    window.config = config
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
        var spinny = getSpinner()
        spinny.spin(target)
        console.log("would like to load intensities",intensityData.location,
         intensityData.format ||  getFileExtension(intensityData.location),
         brainBrowserModel.model_data.name, intensityData.options
       )
       viewer.loadIntensityDataFromURL(intensityData.location, {
        format: intensityData.format ||  getFileExtension(intensityData.location),
        name: intensityData.options.selectColumn,
        model_name: intensityData.field,
        complete: function(){spinny.stop(target)}
      });
        //viewer.loadIntensityDataSetFromURL(intensityData.location, {
        //  format: intensityData.format ||  getFileExtension(intensityData.location),
        //  model_name: brainBrowserModel.model_data.name,
        //  parse: intensityData.options
        //});
      }

    });
  });

  config.data.forEach(function(model){
    var spinny = getSpinner()
    spinny.spin(target)
    viewer.loadModelFromURL(model.location, {
      format: model.format || getFileExtension(model.location),
      complete: function(){spinny.stop(target)}
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

  // Screenshot Button
  var screenshot = { 'Capture Image':function(){ window.open(document.getElementsByTagName("canvas")[0].toDataURL("image/png", "final")) }};
  gui.add(screenshot,'Capture Image');

  // Rotation Options
  var rotation = gui.addFolder("Rotation")
  rotation.add(window.viewer.autorotate, "z")
  rotation.add(window.viewer.autorotate, "y")
  rotation.add(window.viewer.autorotate, "x")

  // Background Color Option
  var bg = config.background_color || "WHITE"
  viewer.setClearColor(COLORS[bg]);
  var colorSelect = {"background color":bg}
  var cs = gui.add(colorSelect,"background color", ["WHITE", "BLACK"])
  cs.onChange(function(coloropt){
    viewer.setClearColor(COLORS[coloropt])
  })


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
      var folders = Object.keys(gui.__folders)
      if (folders.indexOf(brainBrowserModel.model_data.name) < 0){
        var shapeGui = gui.addFolder(brainBrowserModel.model_data.name);
        shapeGui
        .add(shape.material, 'opacity',0,1)
        .onChange(function(newT){
          viewer.setTransparency(newT, {shape_name: shape.name})
        });

        shapeGui.open();
      }
    });

  });

  // TODO handle individual color maps.
  viewer.addEventListener("loadintensitydata", function(event) {
    var model_data = event.model_data;
    var intensity_data = event.intensity_data;
    console.log("intensity_data", intensity_data)
    intensity_data.colormap_name = window.config.colorMap || "Spectral"
    var overlayGui = gui.__folders[model_data.name].addFolder(intensity_data.name);
    overlayGui.open();

    var vmin = overlayGui.add(intensity_data, 'min');
    var vmax = overlayGui.add(intensity_data, 'max');
    var cmap = overlayGui.add(intensity_data, "colormap_name",
                              Object.keys(colormaps))

    vmin.onChange(function(newMin){
      viewer.setIntensityRange(intensity_data, newMin, intensity_data.max)
    });
    vmax.onChange(function(newMax){
      viewer.setIntensityRange(intensity_data, intensity_data.min, newMax)
    });
    cmap.onChange(function(newC){
        console.log("attempting to change cmap of", model_data.name)
        viewer.loadColorMapFromURL(colormaps[newC], {model_name: model_data.name})
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
          columns: ['freesurfer convexity (sulc)', 'freesurfer thickness', 'freesurfer curvature'],
          selectColumn: 'freesurfer thickness'
        }
      }]
    }
  };
  return viewerConfig
}

function getFileExtension(fileLocation){
  return fileLocation.substr(fileLocation.lastIndexOf('.') + 1);
}

// taken from https://css-tricks.com/snippets/jquery/get-query-params-object/
function queryStringToHash(str){
  return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
}

function getSpinner(){
  var opts = {
      lines: 13 // The number of lines to draw
    , length: 28 // The length of each line
    , width: 14 // The line thickness
    , radius: 42 // The radius of the inner circle
    , scale: 1 // Scales overall size of the spinner
    , corners: 1 // Corner roundness (0..1)
    , color: '#000' // #rgb or #rrggbb or array of colors
    , opacity: 0.25 // Opacity of the lines
    , rotate: 0 // The rotation offset
    , direction: 1 // 1: clockwise, -1: counterclockwise
    , speed: 1 // Rounds per second
    , trail: 60 // Afterglow percentage
    , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
    , zIndex: 2e9 // The z-index (defaults to 2000000000)
    , className: 'spinner' // The CSS class to assign to the spinner
    , top: '50%' // Top position relative to parent
    , left: '50%' // Left position relative to parent
    , shadow: false // Whether to render a shadow
    , hwaccel: false // Whether to use hardware acceleration
    , position: 'absolute' // Element positioning
  }
  var spinner = new Spinner(opts) //.spin(target);
  return spinner
}
