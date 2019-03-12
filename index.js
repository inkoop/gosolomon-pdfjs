const url = "https://raw.githubusercontent.com/kevivmatrix/gosolomon-pdfjs/master/sample.pdf";
let pdfDoc = null,
    eventsJSON = null,
    pageNum = 1,
    currentPage = 1,
    totalPages = null,
    perPageHeight = null;

showPDF(url);

// Render the page
const renderPage = page => {
  let scale = 1.5;
  let viewport = page.getViewport(scale);
  let canvas = $("<canvas>")[0];
  canvas.id = "canvas_" + currentPage;
  let context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  //Draw it on the canvas
  page.render({ canvasContext: context, viewport: viewport });

  $("#wrapper").append(canvas);

  let canvasOffset = $(canvas).offset();
  let textLayer = $("<text_layer>")
  $(textLayer).addClass("textLayer");
  let textLayerDiv = $(textLayer).css({
    height : viewport.height+'px',
    width : viewport.width+'px',
    top : canvasOffset.top - 94,
    left : canvasOffset.left
  });

  page.getTextContent().then(function(textContent){
    let textLayer = new TextLayerBuilder({
      textLayerDiv : textLayerDiv.get(0),
      pageIndex : pageNum - 1,
      viewport : viewport
    });
    textLayer.setTextContent(textContent);
    textLayer.render();
  });

  $("#wrapper").append(textLayer);

  currentPage++;
  if (currentPage <= totalPages) {
    thePDF.getPage( currentPage ).then( renderPage );
  } else {
    $("#wrapper").removeClass("hidden");
    perPageHeight = $( "canvas" ).height();
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
  let topOfPage = $("#canvas_" + pageNum).offset().top;
  $("#page_number").text(pageNum);
  $(window).scrollTop(topOfPage);
}

// Get the Document and load the PDF
function showPDF(pdf_url) {
  pdfjsLib.getDocument(url).then(function(pdf) {
    // Set PDFJS global object (so we can easily access in our page functions
    thePDF = pdf;
    // How many pages it has
    totalPages = pdf.numPages;
    $('#total_page_count').text(totalPages);
    createJSON();
    // Render first page
    pdf.getPage( 1 ).then( renderPage );
  })
  .catch(function(error) {
    // Error reason
    console.log(error.message);
  });
}

// Download page
function exportPDF() { 
  let mime_types = [ 'application/pdf' ];
  let download_link = $('<a>')[0];
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
$(window).scroll(function (event) {
  let scrollTop = $(window).scrollTop();
  let calculatedPageNum = Math.ceil(( scrollTop + (perPageHeight / 3) ) / perPageHeight);
  if (pageNum != calculatedPageNum) {
    pageNum = calculatedPageNum;
    $("#page_number").text(pageNum);
    if (scrollTop > lastScrollTop) {
      updateEvents("next_page");
    } else {
      updateEvents("previous_page");
    }
  };
});

// Button event previous and next page
$("#previous_page").on("click", showPreviousPage);
$("#next_page").on("click", showNextPage);
// Button event download
$("#download_button").on("click", exportPDF);
