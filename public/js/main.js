// main.js - Focused on trip management functionality
const API_URL = '/api';

// Global variable to store trips
let trips = [];

// Function to format numbers as currency
function formatCurrency(number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'No dates specified';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0]; // This will return the date part in YYYY-MM-DD format
  };

  if (startDate && endDate) {
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  } else if (startDate) {
    return `From ${formatDate(startDate)}`;
  } else {
    return `Until ${formatDate(endDate)}`;
  }
}




// Load trips data from server
async function loadTrips() {
  try {
    const response = await fetch(`${API_URL}/trips`);
    if (response.ok) {
      trips = await response.json();
      updateTripsUI();
    } else {
      console.error("Failed to load trips");
      trips = [];
      updateTripsUI();
    }
  } catch (error) {
    console.error("Error loading trips:", error);
    trips = [];
    updateTripsUI();
  }
}

// Update the trips list in the UI
function updateTripsUI() {
  const tripsListElement = document.getElementById('trips-list');
  if (!tripsListElement) {
    console.error("Trips list element not found");
    return;
  }
  
  tripsListElement.innerHTML = '';
  
  if (trips.length === 0) {
    tripsListElement.innerHTML = '<p>No trips found. Create a new trip to get started.</p>';
    return;
  }
  
  // Sort trips by start date (newest first)
  trips.sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
    const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
    return dateB - dateA;
  });
  
  trips.forEach(trip => {
    const tripElement = document.createElement('div');
    tripElement.className = 'trip-card';
    
    tripElement.innerHTML = `
      <div class="trip-info">
        <h3>${trip.name}</h3>
        <p>${trip.description || 'No description'}</p>
        <p>Date: ${formatDateRange(trip.start_date, trip.end_date)}</p>
      </div>
      <div class="trip-actions">
        <button class="open-trip-btn" data-url="/trip/${trip.url_id}">Open</button>
        <button class="edit-trip-btn" data-id="${trip.id}">Edit</button>
        <button class="remove-trip-btn" data-id="${trip.id}">Remove</button>
      </div>
    `;
    
    tripsListElement.appendChild(tripElement);
  });
  
  // Add event listeners
  document.querySelectorAll('.open-trip-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      window.location.href = this.getAttribute('data-url');
    });
  });
  
  document.querySelectorAll('.edit-trip-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tripId = this.getAttribute('data-id');
      openEditTripForm(tripId);
    });
  });
  
  document.querySelectorAll('.remove-trip-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tripId = this.getAttribute('data-id');
      removeTrip(tripId);
    });
  });
}



// Create a new trip
async function createTrip(e) {
  e.preventDefault();
  
  const tripName = document.getElementById('trip-name').value.trim();
  const tripDescription = document.getElementById('trip-description').value.trim();
  const tripStartDate = document.getElementById('trip-start-date').value;
  const tripEndDate = document.getElementById('trip-end-date').value;
  
  if (!tripName) {
    alert('Please enter a trip name');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: tripName,
        description: tripDescription,
        start_date: tripStartDate || null,
        end_date: tripEndDate || null
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Reset form
      document.getElementById('trip-form').reset();
      
      // Reload trips
      await loadTrips();
      
      // Optionally, navigate to the new trip
      if (result.url_id) {
        window.location.href = `/trip/${result.url_id}`;
      }
    } else {
      alert('Failed to create trip');
    }
  } catch (error) {
    console.error("Error creating trip:", error);
    alert('Failed to connect to server');
  }
}

async function removeTrip(tripId) {
  if (!confirm('Are you sure you want to delete this trip?')) {
    return;
  }
  
  console.log(`Attempting to delete trip with ID: ${tripId}`);
  
  try {
    console.log(`Sending DELETE request to: ${API_URL}/trips/${tripId}`);
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Server response status: ${response.status}`);
    
    if (response.ok) {
      console.log('Delete successful, updating UI');
      // Remove trip from local array
      trips = trips.filter(trip => trip.id != tripId);
      // Update UI
      updateTripsUI();
    } else {
      const errorText = await response.text();
      console.error(`Server error response: ${errorText}`);
      alert('Failed to delete trip');
    }
  } catch (error) {
    console.error("Error deleting trip:", error);
    alert('Failed to connect to server');
  }
}

// Function to open the edit trip form
function openEditTripForm(tripId) {
  const trip = trips.find(t => t.id == tripId);
  if (!trip) {
    alert('Trip not found');
    return;
  }
  
  // Populate the form with trip data
  document.getElementById('edit-trip-id').value = trip.id;
  document.getElementById('edit-trip-name').value = trip.name;
  document.getElementById('edit-trip-description').value = trip.description || '';
  document.getElementById('edit-trip-start-date').value = trip.start_date ? new Date(trip.start_date).toISOString().split('T')[0] : '';
  document.getElementById('edit-trip-end-date').value = trip.end_date ? new Date(trip.end_date).toISOString().split('T')[0] : '';
  
  // Show the modal
  document.getElementById('edit-trip-modal').classList.remove('hidden');
}


// Function to update a trip
async function updateTrip(e) {
  e.preventDefault();
  
  const tripId = document.getElementById('edit-trip-id').value;
  const tripName = document.getElementById('edit-trip-name').value.trim();
  const tripDescription = document.getElementById('edit-trip-description').value.trim();
  const tripStartDate = document.getElementById('edit-trip-start-date').value;
  const tripEndDate = document.getElementById('edit-trip-end-date').value;
  
  if (!tripName) {
    alert('Please enter a trip name');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: tripName,
        description: tripDescription,
        start_date: tripStartDate || null,
        end_date: tripEndDate || null
      })
    });
    
    if (response.ok) {
      // Hide the modal
      document.getElementById('edit-trip-modal').classList.add('hidden');
      
      // Reload trips
      await loadTrips();
    } else {
      alert('Failed to update trip');
    }
  } catch (error) {
    console.error("Error updating trip:", error);
    alert('Failed to connect to server');
  }
}


// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  
  // Make sure trip management section is visible on main page
  const tripManagementSection = document.getElementById('trip-management-section');
  if (tripManagementSection) {
    tripManagementSection.style.display = 'block';
  }
  
  // Load trips data
  loadTrips();
  
  // Set up event listeners
  const tripForm = document.getElementById('trip-form');
  if (tripForm) {
    tripForm.addEventListener('submit', createTrip);
  }
  
  // Set today's date as default for trip start date
  const startDateInput = document.getElementById('trip-start-date');
  if (startDateInput) {
    startDateInput.value = new Date().toISOString().split('T')[0];
  }

	// Set up the edit trip form
  const editTripForm = document.getElementById('edit-trip-form');
  if (editTripForm) {
    editTripForm.addEventListener('submit', updateTrip);
  }
  
  // Close modal when the close button is clicked
  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      document.getElementById('edit-trip-modal').classList.add('hidden');
    });
  }
});
