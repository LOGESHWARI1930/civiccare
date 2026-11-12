/**
 * CivicCare Multi-Step Grievance Report & Detail Controller
 */

let mapInstance = null;
let markerInstance = null;
let currentStep = 1;
let selectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path.includes('create-complaint.html') || path.includes('/citizen/report')) {
    Auth.requireAuth(['citizen']);
    initMultiStepReportForm();
  } else if (path.includes('complaint-details.html') || path.includes('/citizen/complaints/')) {
    Auth.requireAuth();
    loadComplaintDetailsPage();
  }
});

/**
 * Initialize Multi-Step Report Form
 */
function initMultiStepReportForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const preCategory = urlParams.get('category');
  if (preCategory) {
    selectCategory(preCategory);
  }

  const fileInput = document.getElementById('image-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  const cameraInput = document.getElementById('camera-input');
  if (cameraInput) {
    cameraInput.addEventListener('change', handleFileSelect);
  }
}

/**
 * Select Category Card Handler (Step 1)
 */
function selectCategory(categoryName) {
  document.getElementById('selected-category').value = categoryName;
  const cards = document.querySelectorAll('.category-card');
  cards.forEach(card => {
    if (card.getAttribute('data-category') === categoryName) {
      card.classList.add('selected', 'border-primary', 'bg-light');
    } else {
      card.classList.remove('selected', 'border-primary', 'bg-light');
    }
  });
}

/**
 * Step Navigation Router
 */
function goToStep(stepNumber) {
  if (stepNumber === 2 && currentStep === 1) {
    const category = document.getElementById('selected-category').value;
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!category) {
      showToast('Please select a grievance category card.', 'warning');
      return;
    }
    if (!title) {
      showToast('Please enter a complaint title.', 'warning');
      return;
    }
    if (!description) {
      showToast('Please enter a detailed description.', 'warning');
      return;
    }
  }

  if (stepNumber === 3 && currentStep === 2) {
    const address = document.getElementById('address').value.trim();
    const area = document.getElementById('area').value.trim();

    if (!address && !area) {
      showToast('Please enter street address or area details.', 'warning');
      return;
    }
  }

  if (stepNumber === 4) {
    populateReviewSummary();
  }

  document.querySelectorAll('.report-step').forEach(step => step.classList.add('d-none'));

  const targetStepEl = document.getElementById(`step-${stepNumber}`);
  if (targetStepEl) {
    targetStepEl.classList.remove('d-none');
    currentStep = stepNumber;
    updateStepProgress(stepNumber);
  }

  if (stepNumber === 2) {
    if (!mapInstance) {
      setTimeout(initStep2Map, 150);
    } else {
      setTimeout(() => mapInstance.invalidateSize(), 100);
    }
  }
}

/**
 * Progress Bar Indicator Handler
 */
function updateStepProgress(stepNumber) {
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`progress-step-${i}`);
    if (indicator) {
      if (i < stepNumber) {
        indicator.className = 'step-badge completed';
      } else if (i === stepNumber) {
        indicator.className = 'step-badge active';
      } else {
        indicator.className = 'step-badge';
      }
    }
  }
}

/**
 * Initialize Leaflet Map for Location Selection (Step 2)
 */
function initStep2Map() {
  const mapContainer = document.getElementById('step2-map');
  if (!mapContainer || mapInstance) return;

  const defaultLat = 12.9716;
  const defaultLng = 77.5946;

  mapInstance = L.map('step2-map').setView([defaultLat, defaultLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  markerInstance = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(mapInstance);

  document.getElementById('latitude').value = defaultLat.toFixed(6);
  document.getElementById('longitude').value = defaultLng.toFixed(6);

  markerInstance.on('dragend', function (e) {
    const coord = e.target.getLatLng();
    updateCoordinates(coord.lat, coord.lng);
  });

  mapInstance.on('click', function (e) {
    markerInstance.setLatLng(e.latlng);
    updateCoordinates(e.latlng.lat, e.latlng.lng);
  });
}

function updateCoordinates(lat, lng) {
  document.getElementById('latitude').value = parseFloat(lat).toFixed(6);
  document.getElementById('longitude').value = parseFloat(lng).toFixed(6);
}

function useCurrentLocationGPS() {
  if (!navigator.geolocation) {
    showToast('Geolocation API is not supported by your browser.', 'warning');
    return;
  }

  showToast('Fetching your GPS coordinates...', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (mapInstance && markerInstance) {
        mapInstance.setView([lat, lng], 16);
        markerInstance.setLatLng([lat, lng]);
        updateCoordinates(lat, lng);
      }
      showToast('GPS Location pinned successfully!', 'success');
    },
    (err) => {
      console.warn('GPS Geolocation Error:', err.message);
      showToast('Unable to fetch GPS position. Please pick location manually on the map.', 'warning');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    showToast('Only image files (JPEG, PNG, WEBP, GIF) are allowed.', 'danger');
    e.target.value = '';
    return;
  }

  const maxSizeInBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    showToast('Image file size exceeds the 5MB maximum limit.', 'danger');
    e.target.value = '';
    return;
  }

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = function (event) {
    const previewImg = document.getElementById('image-preview-img');
    const previewContainer = document.getElementById('image-preview-container');
    const fileNameEl = document.getElementById('image-file-name');

    if (previewImg && previewContainer) {
      previewImg.src = event.target.result;
      fileNameEl.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      previewContainer.classList.remove('d-none');
    }
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  selectedFile = null;
  const fileInput = document.getElementById('image-input');
  if (fileInput) fileInput.value = '';
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) previewContainer.classList.add('d-none');
}

function populateReviewSummary() {
  const category = document.getElementById('selected-category').value;
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;

  const address = document.getElementById('address').value;
  const area = document.getElementById('area').value;
  const city = document.getElementById('city').value;
  const pincode = document.getElementById('pincode').value;
  const lat = document.getElementById('latitude').value;
  const lng = document.getElementById('longitude').value;

  document.getElementById('rev-category').textContent = category || 'Not selected';
  document.getElementById('rev-title').textContent = title || 'N/A';
  document.getElementById('rev-description').textContent = description || 'N/A';

  const fullAddr = [address, area, city, pincode].filter(Boolean).join(', ');
  document.getElementById('rev-address').textContent = fullAddr || 'N/A';
  document.getElementById('rev-coordinates').textContent = (lat && lng) ? `${lat}, ${lng}` : 'N/A';

  const revImg = document.getElementById('rev-image-preview');
  if (selectedFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      revImg.src = e.target.result;
      revImg.classList.remove('d-none');
    };
    reader.readAsDataURL(selectedFile);
  } else {
    revImg.classList.add('d-none');
  }
}

async function submitFinalComplaint() {
  const submitBtn = document.getElementById('submit-complaint-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting...`;

  try {
    const form = document.getElementById('multi-step-form');
    const formData = new FormData(form);

    if (selectedFile) {
      formData.set('image', selectedFile);
    }

    const res = await apiRequest('/complaints', 'POST', formData, true);

    if (res.success) {
      document.getElementById('step-4').classList.add('d-none');
      document.getElementById('step-progress-bar').classList.add('d-none');

      const confNumber = res.complaint.complaint_number;
      const confId = res.complaint.id;

      document.getElementById('conf-complaint-number').textContent = confNumber;
      document.getElementById('conf-track-btn').href = `/citizen/complaints/${confId}`;
      document.getElementById('step-confirmation').classList.remove('d-none');

      showToast('Grievance Submitted Successfully!', 'success');
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="bi bi-send-fill me-1"></i> Submit Complaint`;
    showToast(err.message || 'Failed to submit grievance. Please try again.', 'danger');
  }
}

/**
 * Load Detailed Complaint Tracking View
 */
async function loadComplaintDetailsPage() {
  const container = document.getElementById('complaint-detail-container');
  if (!container) return;

  // Extract ID from pathname (e.g. /citizen/complaints/1) or URL search params (?id=1)
  const pathParts = window.location.pathname.split('/');
  let complaintId = pathParts[pathParts.length - 1];
  
  if (!complaintId || isNaN(complaintId)) {
    const urlParams = new URLSearchParams(window.location.search);
    complaintId = urlParams.get('id');
  }

  if (!complaintId || isNaN(complaintId)) {
    renderNotFoundView(container, 'Invalid complaint ID specified.');
    return;
  }

  try {
    const res = await fetch(`/api/complaints/${complaintId}`, {
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
    });
    const data = await res.json();

    if (res.status === 404 || !data.success) {
      renderNotFoundView(container, data.message || 'Complaint record not found.');
      return;
    }

    if (res.status === 403) {
      renderUnauthorizedView(container, data.message || 'Unauthorized. You can only view complaints filed under your account.');
      return;
    }

    const { complaint, history } = data;
    const user = Auth.getUser();

    // Standard Workflow Stages definition
    const workflowStages = [
      { key: 'Submitted', label: 'Submitted' },
      { key: 'Under Review', label: 'Under Review' },
      { key: 'Assigned', label: 'Assigned' },
      { key: 'In Progress', label: 'In Progress' },
      { key: 'Resolved', label: 'Resolved' }
    ];

    // Build timeline items map from history records
    const historyMap = {};
    if (history && history.length > 0) {
      history.forEach(h => {
        historyMap[h.status] = h;
      });
    }

    // Determine current status index
    const currentStatusIndex = workflowStages.findIndex(s => s.key === complaint.status);

    // Build professional vertical timeline HTML
    const timelineHtml = workflowStages.map((stage, idx) => {
      const histItem = historyMap[stage.key];
      let icon = '';
      let badgeClass = '';
      let isCompleted = false;
      let isActive = false;

      if (complaint.status === 'Rejected') {
        if (idx === 0) {
          icon = '<i class="bi bi-check-circle-fill text-success fs-5"></i>';
          isCompleted = true;
        } else {
          icon = '<i class="bi bi-circle text-muted"></i>';
        }
      } else if (idx <= currentStatusIndex) {
        if (idx === currentStatusIndex && complaint.status !== 'Resolved') {
          isActive = true;
          icon = '<i class="bi bi-record-circle-fill text-primary fs-5"></i>';
        } else {
          isCompleted = true;
          icon = '<i class="bi bi-check-circle-fill text-success fs-5"></i>';
        }
      } else {
        icon = '<i class="bi bi-circle text-muted"></i>';
      }

      return `
        <div class="timeline-item d-flex gap-3 mb-4">
          <div class="timeline-icon text-center" style="width: 30px;">
            ${icon}
          </div>
          <div class="timeline-content flex-grow-1 p-3 rounded-3 border ${isActive ? 'bg-light border-primary shadow-sm' : 'bg-white'}">
            <div class="d-flex justify-content-between align-items-center">
              <strong class="text-dark ${isActive ? 'fw-bold text-primary' : ''}">${stage.label}</strong>
              ${histItem ? `<small class="text-muted"><i class="bi bi-clock me-1"></i>${new Date(histItem.created_at).toLocaleString()}</small>` : '<small class="text-muted">Pending</small>'}
            </div>
            ${histItem && histItem.comment ? `
              <p class="small text-secondary mb-0 mt-2 bg-light p-2 rounded border">${histItem.comment}</p>
            ` : ''}
            ${histItem && histItem.changed_by_name ? `
              <small class="text-muted d-block mt-1">Updated by: <strong>${histItem.changed_by_name}</strong> (${histItem.changed_by_role})</small>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // If complaint was Rejected, add Rejected step
    let rejectedTimelineItem = '';
    if (complaint.status === 'Rejected') {
      const rejHist = historyMap['Rejected'];
      rejectedTimelineItem = `
        <div class="timeline-item d-flex gap-3 mb-4">
          <div class="timeline-icon text-center" style="width: 30px;">
            <i class="bi bi-x-circle-fill text-danger fs-5"></i>
          </div>
          <div class="timeline-content flex-grow-1 p-3 rounded-3 border border-danger bg-light">
            <div class="d-flex justify-content-between align-items-center">
              <strong class="text-danger">Rejected</strong>
              ${rejHist ? `<small class="text-muted"><i class="bi bi-clock me-1"></i>${new Date(rejHist.created_at).toLocaleString()}</small>` : ''}
            </div>
            ${rejHist && rejHist.comment ? `<p class="small text-danger mb-0 mt-2">${rejHist.comment}</p>` : ''}
          </div>
        </div>
      `;
    }

    // Resolution section if resolved
    let resolutionHtml = '';
    if (complaint.status === 'Resolved' && complaint.resolution_description) {
      resolutionHtml = `
        <div class="card-civic border-success mt-4">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0"><i class="bi bi-shield-check me-2"></i>Official Repair & Resolution Details</h5>
          </div>
          <div class="card-body p-4">
            <p class="fs-6 leading-relaxed mb-3">${complaint.resolution_description}</p>
            ${complaint.resolution_evidence_url ? `
              <div class="mt-3">
                <h6 class="fw-bold mb-2"><i class="bi bi-image me-1"></i>Resolution Evidence Photo (Tap to inspect):</h6>
                <img src="${complaint.resolution_evidence_url}" class="img-fluid rounded border shadow" style="max-height: 360px; cursor: pointer;" alt="Resolution Evidence" onclick="openImageLightbox('${complaint.resolution_evidence_url}', 'Resolution Evidence')">
              </div>
            ` : ''}
            <div class="mt-3 text-muted border-top pt-2">
              <small><i class="bi bi-clock me-1"></i>Resolved on: ${new Date(complaint.resolved_at).toLocaleString()}</small>
            </div>
          </div>
        </div>
      `;
    }

    // Feedback rating section
    let feedbackHtml = '';
    if (complaint.status === 'Resolved') {
      if (complaint.feedback_rating) {
        feedbackHtml = `
          <div class="card-civic border-info mt-4">
            <div class="card-header bg-info text-white">
              <h5 class="mb-0"><i class="bi bi-star-fill me-2"></i>Citizen Feedback & Rating</h5>
            </div>
            <div class="card-body p-4">
              <div class="d-flex align-items-center gap-2 mb-2">
                <span class="fs-4 text-warning">${'★'.repeat(complaint.feedback_rating)}${'☆'.repeat(5 - complaint.feedback_rating)}</span>
                <span class="badge bg-secondary">${complaint.feedback_status || 'Satisfied'}</span>
              </div>
              <p class="mb-1">${complaint.feedback_comment || 'No detailed comment provided.'}</p>
              <small class="text-muted">Submitted by ${complaint.citizen_name} on ${new Date(complaint.feedback_created_at).toLocaleDateString()}</small>
            </div>
          </div>
        `;
      } else if (user && user.role === 'citizen' && complaint.citizen_id === user.id) {
        feedbackHtml = `
          <div class="card-civic border-primary mt-4">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0"><i class="bi bi-chat-square-quote me-2"></i>Give Resolution Feedback</h5>
              <button class="btn btn-light btn-sm fw-bold" data-bs-toggle="collapse" data-bs-target="#feedbackFormCollapse">
                <i class="bi bi-star-fill text-warning me-1"></i> Give Feedback
              </button>
            </div>
            <div class="collapse show" id="feedbackFormCollapse">
              <div class="card-body p-4">
                <form id="feedback-form">
                  <input type="hidden" name="complaint_id" value="${complaint.id}">
                  <div class="mb-3">
                    <label class="form-label fw-bold">Rate your satisfaction (1 to 5 stars):</label>
                    <div class="star-rating" id="star-selector">
                      <i class="bi bi-star-fill text-warning" data-value="1"></i>
                      <i class="bi bi-star-fill text-warning" data-value="2"></i>
                      <i class="bi bi-star-fill text-warning" data-value="3"></i>
                      <i class="bi bi-star-fill text-warning" data-value="4"></i>
                      <i class="bi bi-star-fill text-warning" data-value="5"></i>
                    </div>
                    <input type="hidden" name="rating" id="rating-value" value="5">
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-bold">Resolution Status:</label>
                    <select name="resolution_status" class="form-select">
                      <option value="Satisfied">Satisfied (Issue Completely Fixed)</option>
                      <option value="Partially Resolved">Partially Resolved</option>
                      <option value="Unsatisfied">Unsatisfied (Needs Further Work)</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-bold">Comments / Feedback:</label>
                    <textarea name="comment" class="form-control" rows="3" placeholder="Sharing feedback helps improve municipal services..."></textarea>
                  </div>
                  <button type="submit" class="btn btn-civic-primary"><i class="bi bi-send me-1"></i> Submit Feedback</button>
                </form>
              </div>
            </div>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <!-- Top Navigation & Title Bar -->
      <div class="mb-4">
        <a href="/citizen/complaints" class="text-decoration-none fw-semibold text-secondary d-inline-block mb-2">
          <i class="bi bi-arrow-left me-1"></i> ← Back to My Complaints
        </a>
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom pb-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="fs-4 fw-extrabold text-primary">${complaint.complaint_number}</span>
              ${getStatusBadge(complaint.status)}
              ${getPriorityBadge(complaint.priority)}
            </div>
            <h3 class="fw-bold mb-0 text-dark">${complaint.title}</h3>
          </div>
          <span class="badge bg-light text-dark border p-2"><i class="bi bi-calendar3 me-1"></i>Filed: ${new Date(complaint.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="row g-4">
        <!-- Left Column: Image, Description, Map, Resolution, Feedback -->
        <div class="col-lg-7">
          
          <!-- Complaint Image Card -->
          ${complaint.image_url ? `
            <div class="card-civic mb-4">
              <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-bold"><i class="bi bi-image me-2"></i>Uploaded Photo Evidence</h6>
                <small class="text-muted"><i class="bi bi-zoom-in me-1"></i>Tap to zoom</small>
              </div>
              <div class="card-body p-3 text-center bg-light">
                <img src="${complaint.image_url}" class="img-fluid rounded border shadow-sm" style="max-height: 420px; object-fit: contain; cursor: pointer;" alt="Grievance Image" onclick="openImageLightbox('${complaint.image_url}', '${(complaint.title || 'Evidence Photo').replace(/'/g, "\\'")}')">
              </div>
            </div>
          ` : ''}

          <!-- Description Card -->
          <div class="card-civic mb-4">
            <div class="card-header bg-light">
              <h6 class="mb-0 fw-bold"><i class="bi bi-file-text me-2"></i>Complaint Description</h6>
            </div>
            <div class="card-body p-4">
              <p class="text-secondary fs-6 leading-relaxed mb-0">${complaint.description}</p>
            </div>
          </div>

          <!-- Location & Map Card -->
          <div class="card-civic mb-4">
            <div class="card-header bg-light">
              <h6 class="mb-0 fw-bold"><i class="bi bi-geo-alt-fill text-danger me-2"></i>Location & Coordinates</h6>
            </div>
            <div class="card-body p-4">
              <p class="fw-semibold text-dark mb-2 bg-light p-3 rounded border">
                ${complaint.location_address}
              </p>
              ${(complaint.latitude && complaint.longitude) ? `
                <small class="text-muted d-block mb-3"><i class="bi bi-crosshair me-1"></i>GPS Coordinates: <strong>${complaint.latitude}, ${complaint.longitude}</strong></small>
                <div id="detail-map" class="complaint-map"></div>
              ` : ''}
            </div>
          </div>

          ${resolutionHtml}
          ${feedbackHtml}
        </div>

        <!-- Right Column: Vertical Status Timeline & Assignment Meta -->
        <div class="col-lg-5">
          
          <!-- Assignment Meta Card -->
          <div class="card-civic mb-4">
            <div class="card-header bg-light">
              <h6 class="mb-0 fw-bold"><i class="bi bi-building me-2"></i>Assignment & Officer Metadata</h6>
            </div>
            <div class="card-body p-4">
              <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-muted">Category:</span>
                  <span class="badge bg-light text-dark border">${complaint.category}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-muted">Assigned Department:</span>
                  <strong class="text-primary">${complaint.department_name || 'Unassigned'}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between px-0">
                  <span class="text-muted">Assigned Officer:</span>
                  <strong class="text-dark">${complaint.officer_name || 'Unassigned'} ${complaint.officer_employee_id ? `(${complaint.officer_employee_id})` : ''}</strong>
                </li>
              </ul>
            </div>
          </div>

          <!-- Vertical Status Progress Timeline -->
          <div class="card-civic">
            <div class="card-header bg-light">
              <h6 class="mb-0 fw-bold"><i class="bi bi-hourglass-split me-2"></i>Status Progress Timeline</h6>
            </div>
            <div class="card-body p-4">
              ${timelineHtml}
              ${rejectedTimelineItem}
            </div>
          </div>

        </div>
      </div>
    `;

    // Render detail Leaflet map
    if (complaint.latitude && complaint.longitude) {
      setTimeout(() => {
        const detailMap = L.map('detail-map').setView([complaint.latitude, complaint.longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailMap);
        L.marker([complaint.latitude, complaint.longitude]).addTo(detailMap)
          .bindPopup(`<b>${complaint.complaint_number}</b><br>${complaint.title}`).openPopup();
      }, 200);
    }

    // Feedback Form Submission listener
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(feedbackForm));
        try {
          const res = await apiRequest('/feedback', 'POST', data);
          if (res.success) {
            showToast(res.message, 'success');
            setTimeout(() => window.location.reload(), 1000);
          }
        } catch (err) {}
      });
    }

  } catch (err) {
    renderNotFoundView(container, 'Failed to fetch complaint case file.');
  }
}

/**
 * Render 404 Not Found View
 */
function renderNotFoundView(container, message) {
  container.innerHTML = `
    <div class="text-center py-5 px-3 bg-white rounded shadow-sm border my-4">
      <div class="fs-1 text-warning mb-3"><i class="bi bi-exclamation-triangle-fill"></i></div>
      <h3 class="fw-bold text-dark mb-2">404 — Complaint Not Found</h3>
      <p class="text-muted mb-4">${message}</p>
      <a href="/citizen/complaints" class="btn btn-civic-primary px-4 fw-semibold">
        <i class="bi bi-arrow-left me-1"></i> Back to My Complaints
      </a>
    </div>
  `;
}

/**
 * Render 403 Unauthorized View
 */
function renderUnauthorizedView(container, message) {
  container.innerHTML = `
    <div class="text-center py-5 px-3 bg-white rounded shadow-sm border my-4">
      <div class="fs-1 text-danger mb-3"><i class="bi bi-shield-slash-fill"></i></div>
      <h3 class="fw-bold text-dark mb-2">403 — Unauthorized Access</h3>
      <p class="text-muted mb-4">${message}</p>
      <a href="/citizen/complaints" class="btn btn-civic-primary px-4 fw-semibold">
        <i class="bi bi-arrow-left me-1"></i> Back to My Complaints
      </a>
    </div>
  `;
}
