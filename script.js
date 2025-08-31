// PDF.js configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = getInitialPage();
let pageIsRendering = false;
let pageNumIsPending = null;
let scale = 1.5;
let manualZoom = false;

// Get initial page from localStorage or default to 1
function getInitialPage() {
    try {
        const savedPage = localStorage.getItem('portfolio-current-page');
        if (savedPage) {
            const page = parseInt(savedPage);
            return page > 0 ? page : 1;
        }
    } catch (e) {
        // localStorage might not be available
        console.log('localStorage not available, starting from page 1');
    }
    return 1;
}

// Save current page to localStorage
function saveCurrentPage(pageNumber) {
    try {
        localStorage.setItem('portfolio-current-page', pageNumber.toString());
    } catch (e) {
        // localStorage might not be available, fail silently
        console.log('Could not save page state');
    }
}

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const pdfContainer = document.getElementById('pdf-container');
const loadingDiv = document.getElementById('loading');

// Get elements
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

// Calculate responsive scale
const getResponsiveScale = (page) => {
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Get actual container dimensions
    const container = pdfContainer.parentElement;
    const containerWidth = container.clientWidth - 30; // Account for padding
    const containerHeight = window.innerHeight - (window.innerWidth <= 768 ? 140 : 100); // Account for mobile toolbar height
    
    const scaleX = containerWidth / viewport.width;
    const scaleY = containerHeight / viewport.height;
    
    // For mobile, prioritize fitting width and be more aggressive with scaling
    const isMobile = window.innerWidth <= 768;
    const maxScale = isMobile ? 2.0 : 3.0;
    const minScale = isMobile ? 0.5 : 1.0;
    
    // Use the smaller scale to ensure the page fits entirely
    const autoScale = Math.min(scaleX, scaleY, maxScale);
    
    return Math.max(autoScale, minScale);
};

// Add page transition effect
const addPageTransition = (direction) => {
    const pageContainer = pdfContainer.querySelector('.page');
    if (pageContainer) {
        pageContainer.style.transform = direction === 'next' ? 'translateX(-20px)' : 'translateX(20px)';
        pageContainer.style.opacity = '0.7';
        
        setTimeout(() => {
            pageContainer.style.transform = 'translateX(0)';
            pageContainer.style.opacity = '1';
        }, 150);
    }
};

// Render page
const renderPage = num => {
    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        // Calculate responsive scale if not manually adjusted
        if (!manualZoom) {
            scale = getResponsiveScale(page);
        }
        
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = {
            canvasContext: ctx,
            viewport
        };

        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;

            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });

        // Update page counters and save state
        pageNumSpan.textContent = num;
        saveCurrentPage(num);
    });
};

// Check for pages rendering
const queueRenderPage = num => {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
};

// Show previous page
const showPrevPage = () => {
    if (pageNum <= 1) return;
    addPageTransition('prev');
    pageNum--;
    queueRenderPage(pageNum);
    updateButtons();
};

// Show next page
const showNextPage = () => {
    if (pageNum >= pdfDoc.numPages) return;
    addPageTransition('next');
    pageNum++;
    queueRenderPage(pageNum);
    updateButtons();
};

// Update button states
const updateButtons = () => {
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = pageNum >= pdfDoc.numPages;
};

// Zoom functions
const zoomIn = () => {
    manualZoom = true;
    scale += 0.2;
    queueRenderPage(pageNum);
};

const zoomOut = () => {
    if (scale > 0.4) {
        manualZoom = true;
        scale -= 0.2;
        queueRenderPage(pageNum);
    }
};

// Add click feedback
const addClickFeedback = (button) => {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
};

// Button events
prevBtn.addEventListener('click', (e) => {
    addClickFeedback(e.target);
    showPrevPage();
});
nextBtn.addEventListener('click', (e) => {
    addClickFeedback(e.target);
    showNextPage();
});
zoomInBtn.addEventListener('click', (e) => {
    addClickFeedback(e.target);
    zoomIn();
});
zoomOutBtn.addEventListener('click', (e) => {
    addClickFeedback(e.target);
    zoomOut();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowLeft':
            showPrevPage();
            break;
        case 'ArrowRight':
            showNextPage();
            break;
        case '+':
        case '=':
            zoomIn();
            break;
        case '-':
            zoomOut();
            break;
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    if (!manualZoom && pdfDoc) {
        queueRenderPage(pageNum);
    }
});

// Check if mobile
const isMobile = () => window.innerWidth <= 768;

// Mobile notification functionality
const showMobileNotification = () => {
    if (isMobile() && !localStorage.getItem('mobile-notification-dismissed')) {
        const notification = document.getElementById('mobile-notification');
        notification.classList.add('show');
        
        // Close notification functionality
        const closeBtn = document.getElementById('notification-close');
        const closeNotification = () => {
            notification.classList.remove('show');
            localStorage.setItem('mobile-notification-dismissed', 'true');
        };
        
        closeBtn.addEventListener('click', closeNotification);
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            if (notification.classList.contains('show')) {
                closeNotification();
            }
        }, 8000);
    }
};

// Render all pages for mobile
const renderAllPagesForMobile = async () => {
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-pages-container';
    pdfContainer.appendChild(mobileContainer);

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Calculate scale to fit mobile screen width
            const containerWidth = mobileContainer.clientWidth - 30; // Account for padding
            const scale = Math.min(containerWidth / viewport.width, 2.0);
            
            const scaledViewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;
            
            const pageContainer = document.createElement('div');
            pageContainer.className = 'mobile-page';
            pageContainer.appendChild(canvas);
            mobileContainer.appendChild(pageContainer);
            
            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport
            };
            
            await page.render(renderContext).promise;
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
        }
    }
};

// Load PDF with enhanced loading state and progress
loadingDiv.innerHTML = '<span>Loading the portfolio...</span><div class="progress-bar"><div class="progress-fill"></div></div>';

// Hide the CSS spinner since we're using progress bar
loadingDiv.classList.add('no-spinner');

// Add progress tracking
const loadingTask = pdfjsLib.getDocument('./portfolio.pdf');
loadingTask.onProgress = function(progress) {
    if (progress.loaded && progress.total) {
        const percent = (progress.loaded / progress.total) * 100;
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
    }
};

loadingTask.promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    pageCountSpan.textContent = pdfDoc.numPages;
    
    // Validate page number against total pages
    if (pageNum > pdfDoc.numPages) {
        pageNum = 1;
        saveCurrentPage(pageNum);
    }
    
    // Smooth fade out of loading
    loadingDiv.style.opacity = '0';
    setTimeout(() => {
        loadingDiv.style.display = 'none';
        
        if (isMobile()) {
            // Mobile: render all pages vertically
            renderAllPagesForMobile();
            // Show mobile notification after a brief delay
            setTimeout(showMobileNotification, 1000);
        } else {
            // Desktop: single page navigation
            pdfContainer.appendChild(canvas);
            
            // Animate in the PDF
            canvas.style.opacity = '0';
            canvas.style.transform = 'scale(0.95)';
            
            renderPage(pageNum);
            updateButtons();
            
            setTimeout(() => {
                canvas.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                canvas.style.opacity = '1';
                canvas.style.transform = 'scale(1)';
            }, 100);
        }
    }, 300);
}).catch(err => {
    loadingDiv.innerHTML = '<span style="color: #e53e3e;">Error loading PDF: ' + err.message + '</span>';
    loadingDiv.style.animation = 'none';
    console.error('Error loading PDF:', err);
});