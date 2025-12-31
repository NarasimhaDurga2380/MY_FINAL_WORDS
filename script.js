// Birthday Storybook - Beautiful animated storybook
console.log('Birthday Storybook loading...');

// Audio Controller
class AudioController {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.volume = 0.3; // Default volume (30%)
    }
    
    init() {
        this.audio = document.getElementById('backgroundAudio');
        if (this.audio) {
            this.audio.volume = this.volume;
            this.audio.addEventListener('loadeddata', () => {
                console.log('Background audio loaded successfully');
            });
            this.audio.addEventListener('error', (e) => {
                console.log('Audio loading error:', e);
            });
        }
    }
    
    play() {
        if (this.audio && !this.isPlaying) {
            this.audio.play().then(() => {
                this.isPlaying = true;
                console.log('Background audio started');
            }).catch(error => {
                console.log('Audio autoplay prevented:', error);
                // Will retry when user interacts with page
            });
        }
    }
    
    pause() {
        if (this.audio && this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            console.log('Background audio paused');
        }
    }
    
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol)); // Clamp between 0-1
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    }
}

// Initialize audio controller
const audioController = new AudioController();

// Save app version and user agent
function saveClientInfo(){
    const appVersionMeta = document.querySelector('meta[name="app-version"]');
    const appVersion = appVersionMeta ? appVersionMeta.getAttribute('content') : 'unknown';
    const userAgent = navigator.userAgent || 'unknown';

    // store locally
    try{ localStorage.setItem('clientAppVersion', appVersion); localStorage.setItem('clientUserAgent', userAgent); }catch(e){ /* ignore */ }

    // If gtag is available, send as user_properties
    if (typeof gtag === 'function'){
        try{
            gtag('event','client_info',{app_version: appVersion, user_agent: userAgent});
        }catch(e){ /* ignore */ }
    }
    console.log('Client info saved:', {appVersion, userAgent});
}

// Call saveClientInfo on load
try{ saveClientInfo(); }catch(e){ console.log('Failed to save client info', e); }

// Page audio element for per-page narration
let pageAudio = null;
function initPageAudio(){
    if (pageAudio) return;
    pageAudio = document.createElement('audio');
    pageAudio.id = 'pageAudio';
    pageAudio.preload = 'auto';
    pageAudio.style.display = 'none';
    pageAudio.loop = true; // keep per-page narration looping until page changes
    document.body.appendChild(pageAudio);
}
function playPageAudio(pageIndex){
    if (!pageAudio) initPageAudio();
    const maxIndex = 10; // we have aud1..aud10
    const n = Math.min(pageIndex + 1, maxIndex);
    const src = `audios/aud${n}.mp3`;
    if (pageAudio.src !== src) pageAudio.src = src;
    pageAudio.currentTime = 0;
    pageAudio.volume = 0.9;
    pageAudio.play().then(()=>{
        console.log('Page audio playing', src);
    }).catch(err=>{
        console.log('Page audio play failed', err);
    });
}
function stopPageAudio(){
    if (!pageAudio) return;
    try{
        pageAudio.pause();
        pageAudio.currentTime = 0;
    }catch(e){ /* ignore */ }
}

// Storybook Navigation and Animation Controller
class StoryBook {
    constructor() {
        this.pages = ['landing', 'page1', 'page2', 'page3', 'page4', 'page5', 'page6', 'page7', 'page8', 'page9', 'finale'];
        this.currentPageIndex = 0;
        this.isTransitioning = false;
        
        this.init();
    }
    
    init() {
        // Ensure all pages start with clean styles
        this.clearInlineStyles();
        this.updateNavigation();
        this.updateProgressDots();
        this.addKeyboardListeners();
        this.addTouchListeners();
        
        // Hide navigation buttons on landing page
        this.toggleNavigationVisibility();
    }
    
    clearInlineStyles() {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.style.transform = '';
            page.style.opacity = '';
        });
    }
    
    nextPage() {
        console.log('StoryBook.nextPage called, currentPageIndex:', this.currentPageIndex, 'isTransitioning:', this.isTransitioning);
        if (this.isTransitioning || this.currentPageIndex >= this.pages.length - 1) {
            console.log('nextPage blocked - isTransitioning:', this.isTransitioning, 'at last page:', this.currentPageIndex >= this.pages.length - 1);
            return;
        }
        
        console.log('Calling goToPage with index:', this.currentPageIndex + 1);
        this.goToPage(this.currentPageIndex + 1);
    }
    
    prevPage() {
        if (this.isTransitioning || this.currentPageIndex <= 0) {
            return;
        }
        
        this.goToPage(this.currentPageIndex - 1);
    }
    
    goToPage(pageIndex) {
        if (this.isTransitioning || pageIndex < 0 || pageIndex >= this.pages.length) {
            return;
        }
        
        this.isTransitioning = true;
        
        // Get current and next page elements
        const currentPage = document.getElementById(this.pages[this.currentPageIndex]);
        const nextPage = document.getElementById(this.pages[pageIndex]);
        
        if (!currentPage || !nextPage) {
            return;
        }
        
        // Stop any page narration before transitioning
        try { stopPageAudio(); } catch(e) { /* ignore */ }
        
        // Clear any inline styles first
        currentPage.style.transform = '';
        currentPage.style.opacity = '';
        nextPage.style.transform = '';
        nextPage.style.opacity = '';
        
        // Remove active class from current page (triggers CSS transition)
        currentPage.classList.remove('active');
        
        // Small delay to ensure the removal transition starts
        setTimeout(() => {
            // Show next page
            nextPage.classList.add('active');
            
            // Update current page index
            this.currentPageIndex = pageIndex;
            
            // Update navigation and progress
            this.updateNavigation();
            this.updateProgressDots();
            this.toggleNavigationVisibility();
            
            // Play the narration for the new page (if available)
            try { playPageAudio(this.currentPageIndex); } catch(e) { /* ignore */ }
            
            // Reset transition flag after the CSS transition completes
            setTimeout(() => {
                this.isTransitioning = false;
                
                // Trigger special animations for finale page
                if (this.pages[pageIndex] === 'finale') {
                    this.triggerFinaleAnimation();
                }
            }, 450);
            
        }, 50);
    }
    
    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        // Update previous button
        if (this.currentPageIndex <= 0) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }
        
        // Update next button
        if (this.currentPageIndex >= this.pages.length - 1) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
        }
    }
    
    updateProgressDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index === this.currentPageIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    toggleNavigationVisibility() {
        const navigation = document.querySelector('.navigation');
        const progressDots = document.querySelector('.progress-dots');
        
        if (this.currentPageIndex === 0) {
            // Landing page - hide navigation
            navigation.style.opacity = '0';
            progressDots.style.opacity = '0.7';
        } else {
            // Story pages - show navigation
            navigation.style.opacity = '1';
            progressDots.style.opacity = '1';
        }
    }
    
    triggerFinaleAnimation() {
        // Add extra celebration animation for the birthday finale
        const finaleHearts = document.querySelectorAll('.finale-heart');
        finaleHearts.forEach((heart, index) => {
            setTimeout(() => {
                heart.style.animation = 'floatFinaleHearts 2s infinite ease-in-out';
            }, index * 200);
        });
        
        // Add confetti-like effect
        this.createConfetti();
    }
    
    createConfetti() {
        const container = document.querySelector('.birthday-finale');
        const colors = ['💖', '💕', '💗', '💝', '💓', '🎉', '🎊', '✨'];
        
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.textContent = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.position = 'absolute';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-10px';
                confetti.style.fontSize = '1.5rem';
                confetti.style.pointerEvents = 'none';
                confetti.style.animation = 'confettiFall 3s linear forwards';
                confetti.style.zIndex = '5';
                
                container.appendChild(confetti);
                
                // Remove confetti after animation
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 3000);
            }, i * 100);
        }
    }
    
    restartStory() {
        this.goToPage(0);
    }
    
    addKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                this.nextPage();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.prevPage();
            } else if (e.key === 'Home') {
                e.preventDefault();
                this.restartStory();
            }
        });
    }
    
    addTouchListeners() {
        let startX = 0;
        let startY = 0;
        let startTarget = null;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTarget = e.target;
        });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY || !startTarget) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = startX - endX;
            const deltaY = startY - endY;
            
            // Check if the touch started on scrollable content
            const pageContent = startTarget.closest('.page-content');
            const isScrollableArea = pageContent && (
                pageContent.scrollHeight > pageContent.clientHeight ||
                startTarget.closest('.card-text, .overlay-content')
            );
            
            // Only trigger page navigation if:
            // 1. Horizontal swipe is more significant than vertical
            // 2. Swipe is long enough (50px)
            // 3. Not starting from a scrollable area, OR the vertical movement is minimal
            const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50;
            const isMinimalVerticalMovement = Math.abs(deltaY) < 30;
            
            if (isHorizontalSwipe && (!isScrollableArea || isMinimalVerticalMovement)) {
                if (deltaX > 0) {
                    // Swipe left - next page
                    this.nextPage();
                } else {
                    // Swipe right - previous page
                    this.prevPage();
                }
            }
            
            startX = 0;
            startY = 0;
            startTarget = null;
        });
    }
}

// Add confetti fall animation
const style = document.createElement('style');
style.textContent = `
    @keyframes confettiFall {
        0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Global functions for HTML onclick events - Define early
function beginStory() {
    console.log('Begin Story clicked - transitioning to first page');
    
    // Prevent any other navigation during this function
    if (storyBook) {
        storyBook.isTransitioning = true;
    }
    
    // Get page elements
    const landingPage = document.getElementById('landing');
    const page1 = document.getElementById('page1');
    
    if (landingPage && page1) {
        // Hide landing page and show story page
        landingPage.style.display = 'none';
        page1.style.display = 'flex';
        page1.style.opacity = '1';
        page1.style.transform = 'scale(1)';
        
        // Update classes
        landingPage.classList.remove('active');
        page1.classList.add('active');
        
        // Update storybook state
        if (storyBook) {
            storyBook.currentPageIndex = 1;
            storyBook.isTransitioning = false;
            storyBook.updateNavigation();
            storyBook.updateProgressDots();
            storyBook.toggleNavigationVisibility();
        }
        
        console.log('Transition completed - now on page 1');
    } else {
        console.error('Could not find page elements');
    }
}

// Test function to make sure globals work
function testFunction() {
    console.log('Test function called - globals are working!');
}

// Make sure beginStory is available globally
window.beginStory = function() {
    console.log('*** BEGINSTORY CALLED FROM WINDOW ***');
    actualBeginStory();
};

function actualBeginStory() {
    // Get page elements
    const landingPage = document.getElementById('landing');
    const page1 = document.getElementById('page1');
    
    if (landingPage && page1) {
        // Smooth transition using CSS classes
        landingPage.classList.remove('active');
        page1.classList.add('active');
        
        // Update storybook state
        if (storyBook) {
            storyBook.currentPageIndex = 1;
            storyBook.updateNavigation();
            storyBook.updateProgressDots();
            storyBook.toggleNavigationVisibility();
        }
        
        // Start page narration for page1
        try { playPageAudio(1); } catch(e) { /* ignore */ }
    }
}

// Also keep the original function for compatibility
function beginStory() {
    console.log('*** ORIGINAL BEGINSTORY CALLED ***');
    actualBeginStory();
}

// Make sure storybook is initialized early
console.log('Script loading, about to initialize StoryBook...');

function nextPage() {
    console.log('nextPage called, storyBook:', storyBook);
    if (storyBook) {
        storyBook.nextPage();
    } else {
        console.error('StoryBook not initialized');
        // Try to initialize and then call nextPage
        initializeStoryBook();
        setTimeout(() => {
            if (storyBook) {
                storyBook.nextPage();
            }
        }, 100);
    }
}

function prevPage() {
    if (storyBook) {
        storyBook.prevPage();
    }
}

function restartStory() {
    if (storyBook) {
        storyBook.restartStory();
    }
}

function goToPage(pageIndex) {
    if (storyBook) {
        storyBook.goToPage(pageIndex);
    }
}

function toggleAudio() {
    const audioBtn = document.getElementById('audioToggleBtn');
    const audioIcon = audioBtn.querySelector('.audio-icon');
    
    if (audioController.isPlaying) {
        audioController.pause();
        audioBtn.classList.add('muted');
        audioIcon.textContent = '🔇';
        audioBtn.title = 'Turn on Background Music';
    } else {
        audioController.play();
        audioBtn.classList.remove('muted');
        audioIcon.textContent = '🔊';
        audioBtn.title = 'Turn off Background Music';
    }
}

function initializeStoryBook() {
    if (!storyBook) {
        console.log('Initializing StoryBook...');
        storyBook = new StoryBook();
        
        // Add click listeners to progress dots
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                storyBook.goToPage(index);
            });
        });
    }
}

// Initialize the storybook immediately
let storyBook = new StoryBook();

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, StoryBook already initialized');
    
    // Initialize audio controller
    audioController.init();
    
    // Add direct event listener to begin button
    const beginBtn = document.getElementById('beginBtn');
    console.log('Looking for button with ID beginBtn:', beginBtn);
    
    if (beginBtn) {
        console.log('Begin button ready');
        
        // Simple click event listener
        beginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            actualBeginStory();
        });
        
        // Test if button is clickable
        console.log('Button style display:', beginBtn.style.display);
        console.log('Button disabled:', beginBtn.disabled);
        console.log('Button parent:', beginBtn.parentElement);
        console.log('Button computed style visibility:', window.getComputedStyle(beginBtn).visibility);
        console.log('Button computed style pointerEvents:', window.getComputedStyle(beginBtn).pointerEvents);
        console.log('Button computed style zIndex:', window.getComputedStyle(beginBtn).zIndex);
    } else {
        console.error('Begin button not found');
        // Let's see what buttons DO exist
        const allButtons = document.querySelectorAll('button');
        console.log('All buttons found:', allButtons.length);
        allButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.id, btn.className, btn.textContent);
        });
    }
    
    // Temporarily disable progress dot listeners to test
    console.log('Re-enabling progress dot listeners');
    
    // Add click listeners to progress dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            storyBook.goToPage(index);
        });
    });
    
    // Add smooth scroll prevention (only for wheel, not touch)
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Overlay logic
    const overlay = document.getElementById('screenOverlay');
    const ribbonBtn = document.getElementById('ribbonBtn');
    const cardText = document.getElementById('cardText');
    const showMoreLink = document.getElementById('showMoreLink');
    if (showMoreLink && cardText) {
        showMoreLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (cardText.classList.contains('expanded')) {
                cardText.classList.remove('expanded');
                showMoreLink.textContent = 'Show more';
            } else {
                cardText.classList.add('expanded');
                showMoreLink.textContent = 'Show less';
                setTimeout(() => {
                    cardText.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        });
    }
    if (overlay && ribbonBtn) {
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        overlay.style.pointerEvents = 'auto';
        ribbonBtn.addEventListener('click', function() {
            // Start background audio using the audio controller
            audioController.play();

            // Stop any existing page audio and start narration for page1 immediately
            try { stopPageAudio(); } catch(e) { /* ignore */ }
            try { playPageAudio(1); } catch(e) { /* ignore */ }
            
            overlay.classList.add('open');
            setTimeout(() => {
                overlay.classList.add('hide');
                setTimeout(() => {
                    overlay.parentNode.removeChild(overlay);
                }, 700); // Remove from DOM after fade out
            }, 1200); // Wait for doors to finish opening
        });
    }
});

// Add window resize handler for responsive adjustments
window.addEventListener('resize', () => {
    // Ensure proper scaling on orientation change
    setTimeout(() => {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            // Clear any inline styles and let CSS handle the display
            page.style.transform = '';
            page.style.opacity = '';
        });
    }, 100);
});

// Gallery for page9
window.galleryImages = ['images/11.jpeg','images/slide1.jpg','images/slide2.jpg','images/slide3.jpg','images/slide4.jpg','images/slide5.jpg','images/slide6.jpg','images/slide7.jpg','images/slide8.jpeg','images/slide9.jpeg','images/slide10.jpeg'];
window.currentGalleryIndex = 0;
function openGallery(){
    const overlay = document.getElementById('galleryOverlay');
    if(!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    window.currentGalleryIndex = 0;
    updateGalleryImage();
}
function closeGallery(){
    const overlay = document.getElementById('galleryOverlay');
    if(!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
}
function updateGalleryImage(){
    const img = document.getElementById('galleryImage');
    const counter = document.getElementById('galleryCounter');
    if(!img || !counter) return;
    img.src = window.galleryImages[window.currentGalleryIndex];
    counter.textContent = (window.currentGalleryIndex+1) + ' / ' + window.galleryImages.length;
}
function nextGalleryImage(){
    if(window.currentGalleryIndex < window.galleryImages.length - 1){
        window.currentGalleryIndex++;
        updateGalleryImage();
    }
}
function prevGalleryImage(){
    if(window.currentGalleryIndex > 0){
        window.currentGalleryIndex--;
        updateGalleryImage();
    }
}
// Keyboard support
document.addEventListener('keydown',(e)=>{
    const overlay = document.getElementById('galleryOverlay');
    if(!overlay || overlay.getAttribute('aria-hidden') === 'true') return;
    if(e.key === 'Escape') closeGallery();
    if(e.key === 'ArrowRight') nextGalleryImage();
    if(e.key === 'ArrowLeft') prevGalleryImage();
});