'use strict';
console.log("HELLO I'M RUNNING THE MAIN STUFF")
var COLORS = {
  WHITE: 0xFFFFFF,
  BLACK: 0x101010
};

/*
BrainBrowser.SurfaceViewer.start('brainbrowser', handleBrainz);

// Pulled out this function from the start call so that it's not so nested.
function handleBrainz(viewer) {
  var inputs = queryStringToHash();
  console.log("inputs", inputs)
  window.viewer = viewer //AK: for debugging in console
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
  }
}
*/
function buildOptions(data, modelData){
  console.log("buildOptions", data, modelData)
  return {
    format: data.format ||  getFileExtension(data.location),
    model_name: modelData.name,
    parse: data.options
  };
}

function loadDataFromSettings(dataSettings, modelData){
  return function(callback){
    BrainBrowser.loader.loadFromURL(
      dataSettings.location,
      function(data, filename, options){
        callback(null, data, filename, options);
      },
      buildOptions(dataSettings, modelData)
    );
  }
}

function loadIntensityData(viewer, config, model_data){
  const intensityData = config.getForLink('intensity', {
    name: model_data.name,
    type: 'surface'
  });

  if(intensityData){
    var overlay_spinny = getSpinner()
    overlay_spinny.spin(target)
    var opts = buildOptions(intensityData, model_data)
    opts["complete"] = function(){
      overlay_spinny.stop(target)
    }
    viewer.loadIntensityDataSetFromURL(intensityData.location, opts);
  }
}

function loadAtlasIntensityData(viewer, bbConfig, model_data){

  const modelOption = {
    name: model_data.name,
    type: 'surface'
  };

  const atlasData = bbConfig.getForLink('atlas.values', modelOption);

  const atlasIntensities = bbConfig.getForLink('intensity.grouped', modelOption);

  if(atlasData && atlasIntensities){

    async.parallel({
      atlas: loadDataFromSettings(atlasData, model_data),
      values: loadDataFromSettings(atlasIntensities, model_data)
    }, function(error, results){
      var data = {};
      var options = {};
      _.each(results, function(result, dataType){
        data[dataType] = result[0];
        options[dataType] = result[2].parse;
      });

      BrainBrowser.SurfaceViewer.parseAtlasData(
        data,
        options,
        viewer.processIntensityDataSet(viewer.getRange(model_data.name), {model_name: model_data.name})
      );
    });
  }
}

function loadData(viewer, config){

  var colorMapIndex = 1;
  var bbConfig = new Config(config);

  viewer.addEventListener('displaymodel', function(brainBrowserModel) {
    loadIntensityData(viewer, bbConfig, brainBrowserModel.model_data);
    loadAtlasIntensityData(viewer, bbConfig, brainBrowserModel.model_data);
  });

  bbConfig.get({type: 'surface'}).forEach(function(model){
    //start a spinner for loading the .vtk file
    var geom_spinny = getSpinner()
    geom_spinny.spin(target)

    viewer.loadModelFromURL(model.location, {
      format: model.format || getFileExtension(model.location),
      complete: function(){geom_spinny.stop(target)}
    });
  });

  viewer.addEventListener("loadcolormap", function(event) {
    viewer.color_map.clamp = true; //clamp=false means don't color outside range
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
  gui.domElement.id = "gui";
  $(".dg.ac")[0].style.top = "605px"
  window.config = config
  // load all the atlas mappers
  config.timepoints.forEach(function(info, index, arr){
    d3.csv(info.file, function(err, data){
      window.initial_mapper = data
      console.log("set the initial mapper data")
      var mapper = {}
      data.forEach(function(val){
        mapper[parseInt(val[info.id_column])] = parseFloat(val[info.value_column])
      });
      arr[index]["mapper"] = mapper
    })
  })
  // add a gui item to switch timepoints
  var tps = _.map(config.timepoints, function(v){return v.name})
  var time_options = {"timepoint":tps[0]}
  gui.add(time_options, "timepoint", tps)
     .onChange(function(newVal){
        var d = _.find(config.timepoints, {name:newVal})
        _.map(d.models, function(v){
          //console.log("changing color of", v)
          colorChanger(v, d.mapper)
        })
     })

  //initialize colorbar
  $(".dg.main.a ul").append('<li style="height: 40px;"><div id="color-bar">empty colorbar</div></li>')

    viewer.addEventListener("changeintensityrange", function(event) {
      var intensity_data = event.intensity_data;
      var canvas = viewer.color_map.createElement(intensity_data.range_min, intensity_data.range_max);
      canvas.id = "spectrum-canvas";
      $("#color-bar").html(canvas);
    });

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

    var overlayGui = gui.__folders[model_data.name].addFolder(intensity_data.name);
    overlayGui.open();

    var intensityGui = {show: true};

    var vmin = overlayGui.add(intensity_data, 'min');
    var vmax = overlayGui.add(intensity_data, 'max');
    var show = overlayGui.add(intensityGui, 'show');

    vmin.onChange(function(newMin){
      viewer.setIntensityRange(intensity_data, newMin, intensity_data.max)
    });
    vmax.onChange(function(newMax){
      viewer.setIntensityRange(intensity_data, intensity_data.min, newMax)
    });

    //make colorbar
    var canvas = viewer.color_map.createElement(intensity_data.range_min, intensity_data.range_max);
    canvas.id = "spectrum-canvas";
    $("#color-bar").html(canvas);

  });
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
    , top: '90%' // Top position relative to parent
    , left: '50%' // Left position relative to parent
    , shadow: false // Whether to render a shadow
    , hwaccel: false // Whether to use hardware acceleration
    , position: 'absolute' // Element positioning
  }
  var spinner = new Spinner(opts) //.spin(target);
  return spinner
}
var target = document.getElementById('brainbrowser')

function colorChanger(model_name, mapper){
  var intensity_data = window.viewer.model_data.get(model_name).intensity_data
  intensity_data[0].atlasValuesByVertex.forEach(function(val, idx, arr){
    intensity_data[0].values[idx] = mapper[val]
  })
  window.viewer.updateColors({
            model_name: model_name
          });
}
