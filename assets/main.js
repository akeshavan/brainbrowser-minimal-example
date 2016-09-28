//BrainBrowser.config.set("model_types.json.worker", "json.worker.js");
/*BrainBrowser.config.set("model_types.mniobj.worker", "mniobj.worker.js");
BrainBrowser.config.set("model_types.wavefrontobj.worker", "wavefrontobj.worker.js");
BrainBrowser.config.set("model_types.freesurferbin.worker", "freesurferbin.worker.js");
BrainBrowser.config.set("model_types.freesurferbin.binary", true);
BrainBrowser.config.set("model_types.freesurferasc.worker", "freesurferasc.worker.js");
BrainBrowser.config.set("intensity_data_types.text.worker", "text.intensity.worker.js");
BrainBrowser.config.set("intensity_data_types.freesurferbin.worker", "freesurferbin.intensity.worker.js");
BrainBrowser.config.set("intensity_data_types.freesurferbin.binary", true);
BrainBrowser.config.set("intensity_data_types.freesurferasc.worker", "freesurferasc.intensity.worker.js");
*/
BrainBrowser.config.set("model_types.vtk.worker", "vtk.worker.js");
BrainBrowser.config.set("intensity_data_types.csv.worker", "csv.intensity.worker.js");
BrainBrowser.config.set('worker_dir', './brainbrowser-2.5.0/workers/');
BrainBrowser.config.set("color_maps", [
  {
    name: "Spectral",
    url: "color-maps/spectral.txt",
  },
  {
    name: "Thermal",
    url: "color-maps/thermal.txt",
  },
  {
    name: "Gray",
    url: "color-maps/gray-scale.txt",
  },
  {
    name: "Blue",
    url: "color-maps/blue.txt",
  },
  {
    name: "Green",
    url: "color-maps/green.txt",
  }
]);

BrainBrowser.SurfaceViewer.start('brainbrowser', handleBrainz);

var gui = new dat.GUI();
var inputs = queryStringToHash();

var modelUrl = inputs.model || './models/vtk/freesurfer_curvature.vtk;./models/vtk/rh_freesurfer_curvature.vtk'
if (modelUrl != inputs.model){
    var overlayUrl = './models/vertices.csv;./models/rh_vertices.csv'
}
else{
    var overlayUrl = inputs.overlay
}
//if multiple input models, need to split then
//var modelUrl = inputs.model
//var overlayUrl = inputs.overlay
modelUrl = modelUrl.split(';');
modelFname = modelUrl.slice(0);
for (f=0; f<modelUrl.length; f++) {
  modelFname[f] = modelUrl[f].split('/').slice(-1).pop();
}
urlsplit = modelUrl[0].split('.');
ext = urlsplit.slice(-1).pop();
if (ext == 'pial' || ext == 'white') {
   format = 'freesurferbin';
   }
else {
   format = ext; // e.g., vtk
}
modelFormat = format;
var totalModels = modelFname.length
console.log("modelformat", modelFormat)

if (overlayUrl)
{
  overlayUrl = overlayUrl.split(';');
  //// need to shallow copy the elements
  overlayFname = overlayUrl.slice(0);
  for (f=0; f<overlayUrl.length; f++) {
      overlayFname[f] = overlayUrl[f].split('/').slice(-1).pop();
  }

  //    // determine model/overlay file formats
  urlsplit = overlayUrl[0].split('.');
  ext = urlsplit.slice(-1).pop();
  if (ext == 'thickness' || ext == 'curv') {
     format = 'freesurferbin';
  }
  else if (ext == 'asc') {
      format = 'freesurferasc';
  }
  else {
        format = ext; // e.g., csv
  }
  overlayFormat = format;
  var totalOverlays = overlayFname.length
}
else {
  totalOverlays = 0
  overlayUrl = []
  overlayFormat = null
}


var colormaps = {}
BrainBrowser.config.get("color_maps").forEach(function(val, idx, arr){colormaps[val.name] = val.url})
console.log(totalModels, totalOverlays)

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
var target = document.getElementById('brainbrowser')
var spinner = new Spinner(opts).spin(target);

// Pulled out this function from the start call so that it's not so nested.
function handleBrainz(viewer) {
  var meshgui;
 // alias BB's THREE
  var THREE = BrainBrowser.SurfaceViewer.THREE;
  var COLORS = {
          WHITE: 0xFFFFFF,
          BLACK: 0x101010
          };

  window.viewer = viewer;
  window.gui = gui;
  window.addedMainGui = false
  window.brainBrowserModels = []
  window.numLoadedModels = 0
  window.numLoadedOverlays = 0
  //Add an event listener.
  viewer.addEventListener('displaymodel', function(brainBrowserModel) {
    window.brainBrowserModel = brainBrowserModel;
    window.brainBrowserModels.push(brainBrowserModel)
    window.numLoadedModels = window.numLoadedModels + 1
    brainBrowserModel.model.children.forEach(function(shape){
      if (shape.type=="Mesh"){
        shape.material = new THREE.MeshLambertMaterial( {
          color: COLORS.WHITE,
          ambient: COLORS.WHITE,
          specular: COLORS.BLACK,
          vertexColors: THREE.VertexColors
        });
    }
    });

    if (window.addedMainGui == false){
    meshgui = gui.addFolder(brainBrowserModel.model_data.name);
    meshgui.open();
    var screenshot = { "Capture Image":function(){ window.open(document.getElementsByTagName("canvas")[0].toDataURL("image/png", "final")) }};
    meshgui.add(screenshot,'Capture Image');
    rotation = gui.addFolder("Rotation")
    rotation.add(window.viewer.autorotate, "z")
    rotation.add(window.viewer.autorotate, "y")
    rotation.add(window.viewer.autorotate, "x")
    window.addedMainGui = true}
    if (window.numLoadedModels == totalModels && window.numLoadedOverlays == totalOverlays){spinner.stop(target)}
  });

  viewer.addEventListener("loadintensitydata", function(event) {
    var model_data = event.model_data;
    var intensity_data = event.intensity_data;
    console.log("model_data name is", model_data.name)
    intensity_data.transparency = 1
    intensity_data.colormap_name = "Spectral"
    window.intensityData = intensity_data;
    overlayGui = meshgui.addFolder(intensity_data.name);
    overlayGui.open();
    var vmin = overlayGui.add(intensity_data, 'min');
    var vmax = overlayGui.add(intensity_data, 'max');
    var transparency = overlayGui.add(intensity_data, 'transparency',0,1);
    var cmap = overlayGui.add(intensity_data, "colormap_name", Object.keys(colormaps))
    vmin.onChange(function(newMin){
      viewer.setIntensityRange(intensity_data, newMin, intensity_data.max)
    })
    vmax.onChange(function(newMax){
      viewer.setIntensityRange(intensity_data, intensity_data.min, newMax)
    })
    transparency.onChange(function(newT){

        viewer.setTransparency(newT, {shape_name: model_data.name+"_1"})
    })
    cmap.onChange(function(newC){
        viewer.loadColorMapFromURL(colormaps[newC], {model_name: model_data.name})
    })
    window.numLoadedOverlays = window.numLoadedOverlays + 1
    if (window.numLoadedModels == totalModels && window.numLoadedOverlays == totalOverlays){spinner.stop(target)}
  });

  viewer.addEventListener("loadcolormap", function(event) {
    viewer.color_map.clamp = false;
  });

  // Start rendering the scene.
  viewer.render();
  viewer.setClearColor(0xFFFFFF);
  viewer.loadColorMapFromURL(BrainBrowser.config.get("color_maps")[0].url);

  // Load a model into the scene.

  var overlayLoader = function(viewer, overlay, format, name, index, all_model_names){
    return function(){
        /*var idx = 0
        viewer.model_data.forEach(function(model_data, model_name){
            model_data.name = all_model_names[idx]
            idx = idx + 1
        })*/
        //console.log("model names are", model_names)
        if (overlay){
        viewer.loadIntensityDataFromURL(overlay, {
          format: format,
          name: name,
          model_name: name
        });
    }}

  }


  for(var surf=0; surf<modelUrl.length; surf++){
    //console.log(modelUrl[surf], overlayUrl[surf])
    viewer.loadModelFromURL(modelUrl[surf], {
      format: modelFormat,
      complete: overlayLoader(window.viewer, overlayUrl[surf], overlayFormat,
                              modelFname[surf], surf, modelFname)
    });
  }

}

// taken from https://css-tricks.com/snippets/jquery/get-query-params-object/
function queryStringToHash(str){
  return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
}
