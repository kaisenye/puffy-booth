import './App.css';
import React, { useRef, useState, useEffect } from 'react';
import { Camera } from 'react-camera-pro';

function App() {
  const camera = useRef(null);
  const [currentFilter, setCurrentFilter] = useState('No Filter');
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [counter, setCounter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalBackground, setModalBackground] = useState('white');
  const [captureTime, setCaptureTime] = useState(null);

  const filters = ['No Filter', 'Grayscale', 'Sepia', 'Vintage', 'Soft', 'Old'];
  const backgroundColors = ['white', 'black', 'pink', 'blue', 'purple'];

  const startPhotoSequence = async () => {
    setIsCapturing(true);
    setImages([]);
    let count = 4;
    
    const currentTime = new Date();
    setCaptureTime(currentTime);
    
    const takePhotos = async () => {
      setCounter(3);
      // First countdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCounter(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCounter(1);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCounter(0);
      await new Promise(resolve => setTimeout(resolve, 200)); // Brief flash of 0
      
      const photo = camera.current.takePhoto();
      setImages(prev => [...prev, photo]);
      count--;

      if (count > 0) {
        setTimeout(takePhotos, 2000);
      } else {
        setIsCapturing(false);
        setCounter(null);
        setShowModal(true);
      }
    };

    takePhotos();
  };

  // Add error handling for camera initialization
  const handleCameraError = (error) => {
    setError(error.message);
    console.error('Camera error:', error);
  };

  // Apply CSS filters based on selection
  const getFilterStyle = () => {
    switch(currentFilter) {
      case 'Grayscale':
        return { filter: 'grayscale(100%) contrast(150%) brightness(120%)' };
      case 'Sepia':
        return { filter: 'sepia(100%)' };
      case 'Vintage':
        return { filter: 'contrast(110%) brightness(110%) sepia(20%)' };
      case 'Soft':
        return { filter: 'brightness(105%) contrast(95%) saturate(90%)' };
      case 'Old':
        return { 
          filter: `
            contrast(70%)        /* -40% contrast */
            brightness(135%)      /* -25% highlights */
            saturate(75%)       /* -45% saturation */
            sepia(10%)          /* Adds slight warmth */
            hue-rotate(5deg)  /* Slight color shift */
            blur(1px)
          `
        };
      default:
        return {};
    }
  };

  // Add this CSS class helper function
  const getFlippedStyle = (filterStyle) => {
    return {
      ...filterStyle,
      transform: 'scaleX(-1)'  // Horizontal flip
    };
  };

  // Format the timestamp in a readable format
  const formatTimestamp = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  // Function to download the photo strip
  const downloadPhotoStrip = () => {
    // Create a canvas to combine the images
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions based on the number of images
    const imgWidth = 200;
    const imgHeight = 150;
    const padding = 20;
    const timestampHeight = 30; // Height for timestamp text
    
    canvas.width = imgWidth + (padding * 2);
    canvas.height = (imgHeight * images.length) + (padding * (images.length + 1)) + timestampHeight;
    
    // Fill with background color
    ctx.fillStyle = modalBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Load and draw each image onto the canvas
    const loadImages = async () => {
      for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = images[i];
        await new Promise(resolve => {
          img.onload = () => {
            // Apply the filter to the canvas context
            const filterStyle = getFilterStyle();
            if (filterStyle.filter) {
              ctx.filter = filterStyle.filter;
            }
            
            // Center the image horizontally
            const x = padding;
            const y = padding + (i * (imgHeight + padding));
            
            // Save the current state
            ctx.save();
            
            // Translate to the center of where the image should be
            ctx.translate(x + imgWidth/2, y + imgHeight/2);
            
            // Flip horizontally
            ctx.scale(-1, 1);
            
            // Draw the image centered (subtract half width/height)
            ctx.drawImage(img, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
            
            // Restore the context
            ctx.restore();
            
            resolve();
          };
        });
      }
      
      // Add timestamp at the bottom
      ctx.filter = 'none'; // Reset filter for text
      ctx.fillStyle = '#dd8502'; // Black text
      ctx.font = '8px Orbitron';
      ctx.textAlign = 'left';
      const timestampY = (imgHeight * images.length) + (padding * (images.length + 1)) + 10; // Added 10px margin top

      ctx.fillText(formatTimestamp(captureTime), padding, timestampY);
      // Convert canvas to data URL and trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'photo-strip.png';
      link.href = dataUrl;
      link.click();
    };
    
    loadImages();
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setImages([]);
  };

  return (
    <div className="App">
      <div className="header">
        <h1>PuffyBooth</h1>
      </div>

      <div className="camera-container">
        {error && <div className="error-message">{error}</div>}
          
        <div className="camera-wrapper" style={getFilterStyle()}>
          {counter !== null && <div className="counter">{counter}</div>}
          <div className="preview-strip">
            {images.map((img, index) => (
              <img 
                key={index} 
                src={img} 
                alt={`Preview ${index + 1}`}
                style={getFlippedStyle(getFilterStyle())}  // Apply both filter and flip
              />
            ))}
          </div>
          <Camera 
            ref={camera}
            aspectRatio={4 / 3}
            errorMessages={{
              noCameraAccessible: 'No camera device accessible. Please connect your camera or try a different browser.',
              permissionDenied: 'Permission denied. Please refresh and give camera permission.',
              switchCamera: 'It is not possible to switch camera to different one because there is only one video device accessible.',
              canvas: 'Canvas is not supported.',
            }}
            onError={handleCameraError}
          />
        </div>
      
        <button 
          className="capture-button"
          onClick={startPhotoSequence}
          disabled={isCapturing}
        >
          {isCapturing ? 'Capturing...' : 'Start Capture'}
        </button>

        <p className="filter-text">
          Choose a filter
        </p>

        <div className="filter-buttons">
          {filters.map((filter) => (
            <button
              key={filter}
              className={`filter-option ${currentFilter === filter ? 'active' : ''}`}
              onClick={() => setCurrentFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="footer">
          <p>PuffyBooth, 2025. Made with ❤️ by Kaisen & Kristina & Puffy</p>
        </div>

        {showModal && (
          <div className="photo-strip-modal">
            <div className="modal-content">
              <div className="photo-strip" style={{ backgroundColor: modalBackground }}>
                {images.map((img, index) => (
                  <img 
                    key={index} 
                    src={img} 
                    alt={`Photo ${index + 1}`}
                    style={getFlippedStyle(getFilterStyle())}
                  />
                ))}
                {captureTime && (
                  <div className="timestamp">
                    {formatTimestamp(captureTime)}
                  </div>
                )}
              </div>
              <div className="background-options">
                {backgroundColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setModalBackground(color)}
                    className={`color-option ${modalBackground === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="modal-buttons">
                <button onClick={downloadPhotoStrip} className="download-button">Download</button>
                <button onClick={handleCloseModal} className="close-button">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
