console.log(
	`
%cHello there, fellow developer!

%cI see you're curious about how this portfolio works. I'm Lê Hoàng Anh (Hani) Ngô. I believe in creating meaningful 
digital experiences, and this is my way of sharing my work with the world.

%cI'm passionate about:
• Creating effective and enjoyable designs that tell a story
• User experiences that feel effortless and smooth
• Clean, maintainable code
• Continuous learning and growth as a designer (graphic & web) and developer

%cI'm on an active lookout for all opportunities that are related to graphic or web design, so if you're looking for
someone who genuinely cares about craft, collaboration, and creating things that matter & happened to stumble upon
this portfolio, I'd love to work with you :)

%cSend me an email: hani@haningo.com
Visit my website: https://haningo.com
Figma link of this portfolio: https://www.figma.com/proto/mmLKKRH6OqeK1ckF6I7Bkl/Hani-Ngo_Portfolio-2025?page-id=0%3A1&node-id=68-454&p=f&viewport=240%2C495%2C0.03&t=u3S5CTszDtmp2psu-1&scaling=contain&content-scaling=fixed

%cThanks for taking the time to look under the hood!
`,
	"color: #3b82f6; font-size: 16px; font-weight: bold;",
	"color:rgb(255, 91, 159); font-size: 13px; line-height: 1.4;",
	"color: #f59e0b; font-size: 13px; font-weight: 600;",
	"color: #06b6d4; font-size: 13px; line-height: 1.5;",
	"color: #10b981; font-size: 13px; font-weight: 500;",
	"color: #f97316; font-size: 11px; font-style: italic; line-height: 1.3;",
);

// PDF.js configuration
pdfjsLib.GlobalWorkerOptions.workerSrc =
	"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let pageNum = getInitialPage();
let pageIsRendering = false;
let pageNumIsPending = null;
let scale = 1.5;
let manualZoom = false;

// getting initial page from localStorage or default to 1
function getInitialPage() {
	try {
		const savedPage = localStorage.getItem("portfolio-current-page");
		if (savedPage) {
			const page = parseInt(savedPage);
			return page > 0 ? page : 1;
		}
	} catch (e) {
		// localStorage might not be available
		console.log("localStorage not available, starting from page 1");
	}
	return 1;
}

// saving current page to localStorage
function saveCurrentPage(pageNumber) {
	try {
		localStorage.setItem("portfolio-current-page", pageNumber.toString());
	} catch (e) {
		// localStorage might not be available, fail silently
		console.log("Could not save page state");
	}
}

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const pdfContainer = document.getElementById("pdf-container");
const loadingDiv = document.getElementById("loading");

// getting elements
const pageNumDisplay = document.getElementById("page-num-display");
const pageNumInput = document.getElementById("page-num-input");
const pageCountSpan = document.getElementById("page-count");
const homeBtn = document.getElementById("home-page");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const downloadBtn = document.getElementById("download-pdf");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");

const getResponsiveScale = (page) => {
	const viewport = page.getViewport({ scale: 1.0 });

	// getting the container that will hold the canvas
	const container = pdfContainer.parentElement;

	// using most of the container space with a smaller safety margin
	const containerWidth = container.clientWidth * 0.95;
	const containerHeight = container.clientHeight * 0.95;

	const scale = Math.min(
		containerWidth / viewport.width,
		containerHeight / viewport.height,
	);

	// dynamic minimum scale based on screen resolution
	// more granular breakpoints to handle various screen sizes properly
	const screenWidth = window.innerWidth;
	let minScale;

	if (screenWidth <= 1366) {
		// 1366x768 (common laptop), 1280x1024, etc
		minScale = 0.4;
	} else if (screenWidth <= 1440) {
		// 1440x900 (MacBook Air 13"), 1440x1080
		minScale = 0.5;
	} else if (screenWidth <= 1680) {
		// 1680x1050 (older iMacs), 1600x1200
		minScale = 0.6;
	} else if (screenWidth <= 1920) {
		// 1920x1080 (full HD), 1920x1200
		minScale = 0.7;
	} else if (screenWidth <= 2560) {
		// 2560x1440 (1440p), 2560x1600 (MacBook Pro 16")
		minScale = 0.8;
	} else {
		// 4K+ screens (3840x2160+), ultrawide screens
		minScale = 0.9;
	}

	return Math.max(minScale, Math.min(scale, 4.0));
};

const addPageTransition = (direction) => {
	const pageContainer = pdfContainer.querySelector(".page");
	if (pageContainer) {
		pageContainer.style.transform =
			direction === "next" ? "translateX(-20px)" : "translateX(20px)";
		pageContainer.style.opacity = "0.7";

		setTimeout(() => {
			pageContainer.style.transform = "translateX(0)";
			pageContainer.style.opacity = "1";
		}, 150);
	}
};

// rendering page
const renderPage = (num) => {
	pageIsRendering = true;

	pdfDoc.getPage(num).then((page) => {
		// calculating responsive scale if not manually adjusted
		if (!manualZoom) {
			scale = getResponsiveScale(page);
		}

		const viewport = page.getViewport({ scale });
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		const renderCtx = {
			canvasContext: ctx,
			viewport,
		};

		page.render(renderCtx).promise.then(() => {
			pageIsRendering = false;

			if (pageNumIsPending !== null) {
				renderPage(pageNumIsPending);
				pageNumIsPending = null;
			}
		});

		// updating page counters and saving state
		pageNumDisplay.textContent = num;
		saveCurrentPage(num);
		updateButtons();
	});
};

// checking for pages rendering
const queueRenderPage = (num) => {
	if (pageIsRendering) {
		pageNumIsPending = num;
	} else {
		renderPage(num);
	}
};

// showing previous page
const showPrevPage = () => {
	if (pageNum <= 1) return;
	addPageTransition("prev");
	pageNum--;
	queueRenderPage(pageNum);
	updateButtons();
};

// showing next page
const showNextPage = () => {
	if (pageNum >= pdfDoc.numPages) return;
	addPageTransition("next");
	pageNum++;
	queueRenderPage(pageNum);
	updateButtons();
};

// going to first page (home button)
const goToFirstPage = () => {
	if (pageNum <= 1) return;
	addPageTransition("prev");
	pageNum = 1;
	queueRenderPage(pageNum);
	updateButtons();
};

// going to specific page
const goToPage = (targetPage) => {
	const page = parseInt(targetPage);
	if (isNaN(page) || page < 1 || page > pdfDoc.numPages || page === pageNum) return false;
	
	const direction = page > pageNum ? "next" : "prev";
	addPageTransition(direction);
	pageNum = page;
	queueRenderPage(pageNum);
	updateButtons();
	return true;
};

// checking if user has seen home button before
const hasSeenHomeButton = () => {
	try {
		return localStorage.getItem("portfolio-seen-home-button") === "true";
	} catch (e) {
		return false;
	}
};

// marking that user has seen home button before
const markHomeButtonSeen = () => {
	try {
		localStorage.setItem("portfolio-seen-home-button", "true");
	} catch (e) {
		// localStorage might not be available, fail silently
	}
};

// adding first-time highlight effect
const addFirstTimeHighlight = () => {
	homeBtn.classList.add("home-button-first-time");
	
	// removing the highlight after animation completes
	setTimeout(() => {
		homeBtn.classList.remove("home-button-first-time");
		markHomeButtonSeen();
	}, 4000); // 3.5s animation + 0.5s buffer
};

// updating button states
const updateButtons = () => {
	const wasHidden = homeBtn.style.display === "none";
	const shouldShow = pageNum > 1;
	
	prevBtn.disabled = pageNum <= 1;
	nextBtn.disabled = pageNum >= pdfDoc.numPages;
	homeBtn.style.display = shouldShow ? "inline-block" : "none";
	
	// if button just became visible and user hasn't seen it before, highlighting it first time
	if (wasHidden && shouldShow && !hasSeenHomeButton()) {
		setTimeout(() => addFirstTimeHighlight(), 200); // Small delay for smooth transition
	}
	
};

// zoom functions
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

// adding click feedback
const addClickFeedback = (button) => {
	button.style.transform = "scale(0.95)";
	setTimeout(() => {
		button.style.transform = "";
	}, 150);
};

// button events
homeBtn.addEventListener("click", (e) => {
	addClickFeedback(e.target);
	goToFirstPage();
});
prevBtn.addEventListener("click", (e) => {
	addClickFeedback(e.target);
	showPrevPage();
});
nextBtn.addEventListener("click", (e) => {
	addClickFeedback(e.target);
	showNextPage();
});
downloadBtn.addEventListener("click", (e) => {
	addClickFeedback(e.target);
	// download functionality is handled by the browser via the download attribute
});
zoomInBtn.addEventListener("click", (e) => {
	addClickFeedback(e.target);
	zoomIn();
});
zoomOutBtn.addEventListener("click", (e) => {
	addClickFeedback(e.target);
	zoomOut();
});

// page number input functionality
pageNumDisplay.addEventListener("click", () => {
	pageNumDisplay.style.display = "none";
	pageNumInput.style.display = "block";
	pageNumInput.value = pageNum;
	pageNumInput.max = pdfDoc ? pdfDoc.numPages : 999;
	pageNumInput.focus();
	pageNumInput.select();
});

// handling input submission
const submitPageInput = () => {
	const targetPage = pageNumInput.value;
	pageNumInput.style.display = "none";
	pageNumDisplay.style.display = "inline";
	
	if (targetPage && goToPage(targetPage)) {
		// successfully navigated to new page
	} else {
		// invalid page, reset display
		pageNumDisplay.textContent = pageNum;
	}
};

pageNumInput.addEventListener("blur", submitPageInput);
pageNumInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		submitPageInput();
	} else if (e.key === "Escape") {
		pageNumInput.style.display = "none";
		pageNumDisplay.style.display = "inline";
	}
});

// keyboard navigation
document.addEventListener("keydown", (e) => {
	switch (e.key) {
		case "Home":
			goToFirstPage();
			break;
		case "ArrowLeft":
			showPrevPage();
			break;
		case "ArrowRight":
			showNextPage();
			break;
		case "+":
		case "=":
			zoomIn();
			break;
		case "-":
			zoomOut();
			break;
	}
});

// window resize handler
window.addEventListener("resize", () => {
	if (!manualZoom && pdfDoc) {
		queueRenderPage(pageNum);
	}
});

// checking if mobile
const isMobile = () => window.innerWidth <= 768;

// mobile notification functionality
const showMobileNotification = () => {
	if (isMobile() && !localStorage.getItem("mobile-notification-dismissed")) {
		const notification = document.getElementById("mobile-notification");
		notification.classList.add("show");

		// closing notification functionality
		const closeBtn = document.getElementById("notification-close");
		const closeNotification = () => {
			notification.classList.remove("show");
			localStorage.setItem("mobile-notification-dismissed", "true");
		};

		closeBtn.addEventListener("click", closeNotification);

		// auto-hide after 8 seconds
		setTimeout(() => {
			if (notification.classList.contains("show")) {
				closeNotification();
			}
		}, 8000);
	}
};

// rendering all pages for mobile
const renderAllPagesForMobile = async () => {
	const mobileContainer = document.createElement("div");
	mobileContainer.className = "mobile-pages-container";
	pdfContainer.appendChild(mobileContainer);

	for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
		try {
			const page = await pdfDoc.getPage(pageNum);
			const viewport = page.getViewport({ scale: 1.0 });

			const containerWidth = mobileContainer.clientWidth - 30;
			const devicePixelRatio = window.devicePixelRatio || 1;

			// scaling for high DPI displays and maintain quality
			const baseScale = containerWidth / viewport.width;
			const qualityScale = Math.max(baseScale * devicePixelRatio, 1.5); // minimum 1.5x scale
			const finalScale = Math.min(qualityScale, 3.0); // cap at 3x for performance

			const scaledViewport = page.getViewport({ scale: finalScale });

			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			canvas.height = scaledViewport.height;
			canvas.width = scaledViewport.width;

			// scaling canvas display size to fit container while preserving quality
			const displayWidth = containerWidth;
			const displayHeight =
				(scaledViewport.height * displayWidth) / scaledViewport.width;

			const pageContainer = document.createElement("div");
			pageContainer.className = "mobile-page";
			pageContainer.style.width = displayWidth + "px";
			pageContainer.style.height = displayHeight + "px";

			canvas.style.width = displayWidth + "px";
			canvas.style.height = displayHeight + "px";

			pageContainer.appendChild(canvas);
			mobileContainer.appendChild(pageContainer);

			const renderContext = {
				canvasContext: ctx,
				viewport: scaledViewport,
			};

			await page.render(renderContext).promise;
		} catch (error) {
			console.error(`Error rendering page ${pageNum}:`, error);
		}
	}
};

// loading PDF with enhanced loading state and progress
loadingDiv.innerHTML =
	'<span>Loading portfolio...</span><div class="progress-bar"><div class="progress-fill"></div></div>';

// hiding the CSS spinner since we're using progress bar
loadingDiv.classList.add("no-spinner");

// adding progress tracking
const loadingTask = pdfjsLib.getDocument("./portfolio.pdf");
loadingTask.onProgress = function(progress) {
	if (progress.loaded && progress.total) {
		const percent = (progress.loaded / progress.total) * 100;
		const progressFill = document.querySelector(".progress-fill");
		if (progressFill) {
			progressFill.style.width = percent + "%";
		}
	}
};

loadingTask.promise
	.then((pdfDoc_) => {
		pdfDoc = pdfDoc_;
		pageCountSpan.textContent = pdfDoc.numPages;

		// validating page number against total pages
		if (pageNum > pdfDoc.numPages) {
			pageNum = 1;
			saveCurrentPage(pageNum);
		}

		// smooth fade out of loading
		loadingDiv.style.opacity = "0";
		setTimeout(() => {
			loadingDiv.style.display = "none";

			if (isMobile()) {
				// mobile: render all pages vertically
				renderAllPagesForMobile();
				// showing mobile notification after a brief delay
				setTimeout(showMobileNotification, 1000);
			} else {
				// desktop: single page navigation
				pdfContainer.appendChild(canvas);

				// animating in the PDF
				canvas.style.opacity = "0";
				canvas.style.transform = "scale(0.95)";

				renderPage(pageNum);
				updateButtons();

				setTimeout(() => {
					canvas.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
					canvas.style.opacity = "1";
					canvas.style.transform = "scale(1)";
				}, 100);
			}
		}, 300);
	})
	.catch((err) => {
		loadingDiv.innerHTML =
			'<span style="color: #e53e3e;">Error loading portfolio: ' +
			err.message +
			"</span>";
		loadingDiv.style.animation = "none";
		console.error("Error loading PDF:", err);
	});
