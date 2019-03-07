const url = "https://raw.githubusercontent.com/kevivmatrix/gosolomon-pdfjs/master/sample.pdf";
let pdfDoc = null,
    eventsJSON = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null;
    totalPages = null,
    canvas = document.getElementById("pdf_canvas"),
    context = canvas.getContext("2d");

showPDF(url);

// Render the page
const renderPage = num => {
  pageIsRendering = true;
  // Get the page
  pdfDoc.getPage(num).then(page => {
    // Set scale
    let viewport = page.getViewport(2);
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const renderCtx = {
      canvasContext : context,
      viewport : viewport,
    };
    page.render(renderCtx).promise.then(() => {
      pageIsRendering = false;
      if(pageNumIsPending !== null){
        renderPage(pageNumIsPending);
        pageNumIsPending = null;
      }
    });
    // Output current page
    document.querySelector('#page_number').textContent = num; 
  });
};

// Check for pages rendering
const queueRenderPage = num => {
  if(pageIsRendering) {
    pageNumIsPending = num;
  } else {
    renderPage(num);
  }
};

// Show previous page
const showPreviousPage = () => {
  if(pageNum <= 1){
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
  updateEvents("previous_page");
}

// Show next page
const showNextPage = () => {
  if(pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
  updateEvents("next_page");
}

// Get the Document and load the PDF
function showPDF(pdf_url) {
  pdfjsLib.getDocument({ url: pdf_url }).then(function(pdf_doc) {
    pdfDoc = pdf_doc;
    createJSON();
    totalPages = pdfDoc.numPages;
    document.querySelector('#total_page_count').textContent = pdfDoc.numPages;
    // Show the first page of PDF
    renderPage(pageNum);
  }).catch(function(error) {
    // Error reason
    console.log(error.message);
  });
}

// Download page
function exportPDF() { 
  let mime_types = [ 'application/pdf' ];
  let download_link = document.createElement('a');
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

// Get timestamp
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

// Button event previous and next page
document.getElementById("previous_page").addEventListener("click", showPreviousPage);
document.getElementById("next_page").addEventListener("click", showNextPage);
// Button event download
document.getElementById("download_button").addEventListener("click", exportPDF);
