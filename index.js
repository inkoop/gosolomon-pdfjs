// const url = "https://raw.githubusercontent.com/kevivmatrix/gosolomon-pdfjs/master/sample.pdf";
const url = "https://raw.githubusercontent.com/kevivmatrix/gosolomon-pdfjs/master/Office-M365-BeyondTheGDPR.pdf";

const maxZoom = 4;
const minZoom = 1;

let viewport = null,
eventsJSON = null,
pageNum = 1,
currentPage = 1,
totalPages = null,
perPageHeight = null,
zoomLevel = 1.5,
linkService,
viewer;

showPDF(url);

// Render the page
const renderPage = page => {
  viewport = page.getViewport(zoomLevel);
  let canvas = jQuery("<canvas>")[0];
  canvas.id = "canvas_" + currentPage;
  let context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  let canvas_wrapper = jQuery("<div class='canvas-wrapper'>");
  canvas_wrapper.html(canvas);

  page.viewport = viewport;
  page.div = canvas_wrapper.get(0);
  page.width = canvas.width;
  page.height = canvas.height;
  page.scale = zoomLevel;
  viewer._pages.push(page);

  jQuery("#content").append(canvas_wrapper);
  //Draw it on the canvas
  page.render({ canvasContext: context, viewport: viewport }).then(function() {
    // Canvas offset
    var canvas_offset = jQuery(canvas).offset();

    // Canvas height
    var canvas_height = jQuery(canvas).get(0).height;

    // Canvas width
    var canvas_width = jQuery(canvas).get(0).width;
    let textLayer = jQuery("<div class='text-layer'>");
    canvas_wrapper.append(textLayer);

    page.getTextContent().then(function(textContent){
      textLayer.css({
        left: canvas_offset.left + 'px',
        height: canvas_height + 'px',
        width: canvas_width + 'px'
      });

      page.getTextContent().then(function(textContent){
        let textLayerContent = new TextLayerBuilder({
          textLayerDiv : textLayer.get(0),
          pageIndex : pageNum - 1,
          viewport : viewport
        });
        textLayerContent.setTextContent(textContent);
        textLayerContent.render();
      });
    });

    page.getAnnotations().then(function (annotationsData) {
      // Render the annotation layer
      pdfjsLib.AnnotationLayer.render({
        viewport: viewport.clone({ dontFlip: true }),
        div: textLayer.get(0),
        annotations: annotationsData,
        page: page,
        linkService: linkService
      });
    });
  });

  currentPage++;
  if (currentPage <= totalPages) {
    thePDF.getPage( currentPage ).then( renderPage );
  } else {
    jQuery("#content").removeClass("hidden");
    perPageHeight = jQuery( "canvas" ).height();
  }
};

// Show previous page
const showPreviousPage = () => {
  if(pageNum <= 1){
    return;
  }
  pageNum--;
  updatePageNumber();
  updateEvents("previous_page");
}

// Show next page
const showNextPage = () => {
  if(pageNum >= totalPages) {
    return;
  }
  pageNum++;
  updatePageNumber();
  updateEvents("next_page");
}

const updatePageNumber = () => {
  let topOfPage = jQuery("#canvas_" + pageNum).offset().top;
  jQuery("#page_number").text(pageNum);
  jQuery(window).scrollTop(topOfPage);
}

// Get the Document and load the PDF
function showPDF(pdf_url) {
  pdfjsLib.getDocument(url).then(function(pdf) {
    // Set pdfjsLib global object (so we can easily access in our page functions
    thePDF = pdf;

    linkService = new pdfjsLib.PDFLinkService();
    linkService.externalLinkTarget = pdfjsLib.externalLinkTarget;
    linkService.externalLinkRel = pdfjsLib.externalLinkRel;
    linkService.setDocument(thePDF);

    viewer = new pdfjsLib.PDFViewer({
      container: jQuery("#content").get(0),
      linkService: linkService
    });
    viewer.setDocument(thePDF);
    viewer._pages = [];
    // viewer.setDocument(thePDF);
    linkService.setViewer(viewer);
    // How many pages it has
    totalPages = pdf.numPages;
    jQuery('#total_page_count').text(totalPages);
    createJSON();
    // Render first page
    pdf.getPage( 1 ).then( renderPage );
  })
  .catch(function(error) {
    // Error reason
    console.log(error.message);
  });
}

function zoom() {
  currentPage = 1;
  try {
    localStorage.setItem("zoomLevel", zoomLevel);
  } catch {}
  jQuery("#content").empty();
  thePDF.getPage( 1 ).then( renderPage );
}

function setPreviousZoomLevel() {
  try {
    if (localStorage.getItem("zoomLevel")) {
      zoomLevel = parseFloat(localStorage.getItem("zoomLevel"));
    }
    if (localStorage.getItem("zoomLevelOption")) {
      jQuery("#scaleSelect").val(localStorage.getItem("zoomLevelOption"));
    }
  } catch {}
}

function setCurrentZoomLevelOption(zoomLevelOption) {
  try {
    localStorage.setItem("zoomLevelOption", zoomLevelOption);
  } catch {}
}

setPreviousZoomLevel();

// Download page
function exportPDF() { 
  let mime_types = [ 'application/pdf' ];
  let download_link = jQuery('<a>')[0];
  if ('download' in download_link) {
    download_link.download = "test.pdf";
  }
  download_link.href = url;
  download_link.click();
  updateEvents("download");
}

// Add json for each event occured
function updateEvents(event) {
  let now_utc = getCurrentTimestamp();
  let object = new Object();
  object.timeStamp = now_utc;
  if (event == "download") {
    object.download = "done";
  } else if (event == "zoomed_in") {
    object.zoomed_in = "done";
  } else if (event == "zoomed_out") {
    object.zoomed_out = "done";
  } else {
    object.page = pageNum;
  }
  eventsJSON.events.push(object);
  console.log(JSON.stringify(eventsJSON));
}

// Get current timestamp
function getCurrentTimestamp() {
  let now = new Date();
  let now_utc = now.valueOf();
  return now_utc;
}

// Create json array when document open
function createJSON() {
  eventsJSON = new Object();
  eventsJSON.documentopen = getCurrentTimestamp();
  eventsJSON.events = [];
  updateEvents("load");
}

let lastScrollTop = 0;
jQuery(window).scroll(function (event) {
  let scrollTop = jQuery(window).scrollTop();
  let calculatedPageNum = Math.ceil(( scrollTop + (perPageHeight / 3) ) / perPageHeight);
  if (pageNum != calculatedPageNum) {
    pageNum = calculatedPageNum;
    jQuery("#page_number").text(pageNum);
    if (scrollTop > lastScrollTop) {
      updateEvents("next_page");
    } else {
      updateEvents("previous_page");
    }
  };
});

// Button for previous and next page events
jQuery("#previous_page").on("click", showPreviousPage);
jQuery("#next_page").on("click", showNextPage);
// Button for download event
jQuery("#download_button").on("click", exportPDF);
// Button for zoom events
jQuery("#zoom_in").on("click", function() {
  zoomLevel += 0.5;
  if (zoomLevel == maxZoom)
    jQuery(this).hide();
  if (zoomLevel > minZoom)
    jQuery("#zoom_out").show();
  updateEvents("zoomed_in");
  zoom();
});
jQuery("#zoom_out").on("click", function() {
  zoomLevel -= 0.5;
  if (zoomLevel == minZoom)
    jQuery(this).hide();
  if (zoomLevel < maxZoom)
    jQuery("#zoom_in").show();
  updateEvents("zoomed_out");
  zoom();
});
jQuery("#scaleSelect").on('change', function() {
  let zoomValue = jQuery(this).val();
  setCurrentZoomLevelOption(zoomValue);
  switch(zoomValue) {
    case "page-actual":
      zoomLevel = 1;
      break;
    case "page-fit":
      let window_height = jQuery(window).height() - jQuery("#top_bar").outerHeight();
      zoomLevel = (window_height * zoomLevel ) / viewport.height;
      break;
    case "page-width":
      let window_width = jQuery(window).width();
      zoomLevel = (window_width * zoomLevel ) / viewport.width;
      break;
    default:
      zoomLevel = parseFloat(zoomValue);
  }
  updateEvents("zoomed_out");
  zoom();
});
