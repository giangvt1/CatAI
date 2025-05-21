/**
 * Loading indicator component for CatAI
 * Shows an animated cat while loading responses
 */
export class LoadingIndicator {
  private container: HTMLElement;
  private isVisible = false;
  
  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.createElement('div');
    this.render();
  }
  
  /**
   * Show the loading indicator
   */
  public show(): void {
    if (!this.isVisible) {
      this.container.classList.add('visible');
      this.isVisible = true;
    }
  }
  
  /**
   * Hide the loading indicator
   */
  public hide(): void {
    if (this.isVisible) {
      this.container.classList.remove('visible');
      this.isVisible = false;
    }
  }
  
  /**
   * Toggle the loading indicator visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Check if the loading indicator is visible
   */
  public isActive(): boolean {
    return this.isVisible;
  }
  
  /**
   * Render the loading indicator
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="loading-indicator">
        <img src="/loading-cat.svg" alt="Loading..." class="loading-cat" />
        <div class="loading-text">
          <span>Thinking</span>
          <span class="dot-1">.</span>
          <span class="dot-2">.</span>
          <span class="dot-3">.</span>
        </div>
      </div>
    `;
    
    // Add necessary CSS classes
    this.container.classList.add('loading-container');
  }
}