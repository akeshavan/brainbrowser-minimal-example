BrainBrowser.config.set("model_types.vtk.worker", "vtk.worker.js");
BrainBrowser.config.set("intensity_data_types.csv.worker", "csv.intensity.worker.js");
BrainBrowser.config.set("intensity_data_types.csvcolumn.worker", "csvcolumn.intensity.worker.js");
BrainBrowser.config.set("intensity_data_types.atlas_csv.worker", "atlas.intensity.worker.js");
BrainBrowser.config.set('worker_dir', '/client/brainbrowser-minimal-example/brainbrowser/src/brainbrowser/workers/');
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
  },
  {
    name: "RedBlue",
    url: "/client/brainbrowser-minimal-example/color-maps/redblue.txt",
  }
]);


BrainBrowser.SurfaceViewer.parseAtlasData = function(data, options, callback) {
  "use strict";

  var worker_url_type = 'atlas_csv_intensity';
  var error_message;

  // if (!BrainBrowser.SurfaceViewer.worker_urls[worker_url_type]) {
  //   error_message = "error in SurfaceViewer configuration.\n" +
  //     "Intensity data worker URL for " + type + " not defined.\n" +
  //     "Use 'BrainBrowser.config.set(\"intensity_data_types." + type + ".worker\", ...)' to set it.";

  //   BrainBrowser.events.triggerEvent("error", { message: error_message });
  //   throw new Error(error_message);
  // }

  var worker = new Worker(BrainBrowser.SurfaceViewer.worker_urls[worker_url_type]);

  worker.addEventListener("message", function(e) {
    callback(e.data);
    worker.terminate();
  });

  var url = BrainBrowser.utils.getWorkerImportURL();
  worker.postMessage({ cmd: "parse", data: data, url: url, options: options });
};
