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
	  // console.log('Loaded trips:', trips); // Add this line
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
        <p>${trip.description || 'No description'} (${trip.trip_currency || 'USD'})</p>
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
  const tripCurrency = document.getElementById('trip-currency').value;
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
		currency: tripCurrency,
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
  document.getElementById('edit-trip-currency').value = trip.trip_currency || 'USD';
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
  const tripCurrency = document.getElementById('edit-trip-currency').value;
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
		currency: tripCurrency,
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


// Function to populate the currency dropdown
function populateCurrencyDropdown() {
  const currencyDropdowns = document.querySelectorAll('#trip-currency, #edit-trip-currency');
  const currencyCodes = Object.keys(currencyConfig);
  
  currencyDropdowns.forEach(dropdown => {
    dropdown.innerHTML = currencyCodes.map(code => 
      `<option value="${code}">${code}</option>`
    ).join('');
  });
}


// Call this function after the DOM is loaded
document.addEventListener('DOMContentLoaded', populateCurrencyDropdown);


// Currency configuration object
const currencyConfig = {
  SGD: { symbol: 'S$', code: 'SGD', decimals: 2, useSpace: false },
  USD: { symbol: 'US$', code: 'USD', decimals: 2, useSpace: false },
  EUR: { symbol: '€', code: 'EUR', decimals: 2, useSpace: false },
  JPY: { symbol: '¥', code: 'JPY', decimals: 0, useSpace: false },
  MYR: { symbol: 'MYR', code: 'MYR', decimals: 2, useSpace: true },
  GBP: { symbol: '£', code: 'GBP', decimals: 2, useSpace: false },
  AED: { symbol: 'AED', code: 'AED', decimals: 2, useSpace: true },
  AFN: { symbol: 'AFN', code: 'AFN', decimals: 2, useSpace: true },
  ALL: { symbol: 'ALL', code: 'ALL', decimals: 2, useSpace: true },
  AMD: { symbol: 'AMD', code: 'AMD', decimals: 2, useSpace: true },
  ANG: { symbol: 'ANG', code: 'ANG', decimals: 2, useSpace: true },
  AOA: { symbol: 'AOA', code: 'AOA', decimals: 2, useSpace: true },
  ARS: { symbol: 'ARS', code: 'ARS', decimals: 2, useSpace: true },
  AUD: { symbol: 'A$', code: 'AUD', decimals: 2, useSpace: false },
  AWG: { symbol: 'AWG', code: 'AWG', decimals: 2, useSpace: true },
  AZN: { symbol: 'AZN', code: 'AZN', decimals: 2, useSpace: true },
  BAM: { symbol: 'BAM', code: 'BAM', decimals: 2, useSpace: true },
  BBD: { symbol: 'BBD', code: 'BBD', decimals: 2, useSpace: true },
  BDT: { symbol: 'BDT', code: 'BDT', decimals: 2, useSpace: true },
  BGN: { symbol: 'BGN', code: 'BGN', decimals: 2, useSpace: true },
  BHD: { symbol: 'BHD', code: 'BHD', decimals: 3, useSpace: true },
  BIF: { symbol: 'BIF', code: 'BIF', decimals: 0, useSpace: true },
  BMD: { symbol: 'BMD', code: 'BMD', decimals: 2, useSpace: true },
  BND: { symbol: 'BND', code: 'BND', decimals: 2, useSpace: true },
  BOB: { symbol: 'BOB', code: 'BOB', decimals: 2, useSpace: true },
  BRL: { symbol: 'BRL', code: 'BRL', decimals: 2, useSpace: true },
  BSD: { symbol: 'BSD', code: 'BSD', decimals: 2, useSpace: true },
  BTN: { symbol: 'BTN', code: 'BTN', decimals: 2, useSpace: true },
  BWP: { symbol: 'BWP', code: 'BWP', decimals: 2, useSpace: true },
  BYN: { symbol: 'BYN', code: 'BYN', decimals: 2, useSpace: true },
  BZD: { symbol: 'BZD', code: 'BZD', decimals: 2, useSpace: true },
  CAD: { symbol: 'CAD', code: 'CAD', decimals: 2, useSpace: true },
  CDF: { symbol: 'CDF', code: 'CDF', decimals: 2, useSpace: true },
  CHF: { symbol: 'CHF', code: 'CHF', decimals: 2, useSpace: true },
  CLP: { symbol: 'CLP', code: 'CLP', decimals: 0, useSpace: true },
  CNY: { symbol: 'CNY', code: 'CNY', decimals: 2, useSpace: true },
  COP: { symbol: 'COP', code: 'COP', decimals: 2, useSpace: true },
  CRC: { symbol: 'CRC', code: 'CRC', decimals: 2, useSpace: true },
  CUP: { symbol: 'CUP', code: 'CUP', decimals: 2, useSpace: true },
  CVE: { symbol: 'CVE', code: 'CVE', decimals: 2, useSpace: true },
  CZK: { symbol: 'CZK', code: 'CZK', decimals: 2, useSpace: true },
  DJF: { symbol: 'DJF', code: 'DJF', decimals: 0, useSpace: true },
  DKK: { symbol: 'DKK', code: 'DKK', decimals: 2, useSpace: true },
  DOP: { symbol: 'DOP', code: 'DOP', decimals: 2, useSpace: true },
  DZD: { symbol: 'DZD', code: 'DZD', decimals: 2, useSpace: true },
  EGP: { symbol: 'EGP', code: 'EGP', decimals: 2, useSpace: true },
  ERN: { symbol: 'ERN', code: 'ERN', decimals: 2, useSpace: true },
  ETB: { symbol: 'ETB', code: 'ETB', decimals: 2, useSpace: true },
  FJD: { symbol: 'FJD', code: 'FJD', decimals: 2, useSpace: true },
  FKP: { symbol: 'FKP', code: 'FKP', decimals: 2, useSpace: true },
  GEL: { symbol: 'GEL', code: 'GEL', decimals: 2, useSpace: true },
  GHS: { symbol: 'GHS', code: 'GHS', decimals: 2, useSpace: true },
  GIP: { symbol: 'GIP', code: 'GIP', decimals: 2, useSpace: true },
  GMD: { symbol: 'GMD', code: 'GMD', decimals: 2, useSpace: true },
  GNF: { symbol: 'GNF', code: 'GNF', decimals: 0, useSpace: true },
  GTQ: { symbol: 'GTQ', code: 'GTQ', decimals: 2, useSpace: true },
  GYD: { symbol: 'GYD', code: 'GYD', decimals: 2, useSpace: true },
  HKD: { symbol: 'HK$', code: 'HKD', decimals: 2, useSpace: false },
  HNL: { symbol: 'HNL', code: 'HNL', decimals: 2, useSpace: true },
  HTG: { symbol: 'HTG', code: 'HTG', decimals: 2, useSpace: true },
  HUF: { symbol: 'HUF', code: 'HUF', decimals: 2, useSpace: true },
  IDR: { symbol: 'IDR', code: 'IDR', decimals: 2, useSpace: true },
  ILS: { symbol: 'ILS', code: 'ILS', decimals: 2, useSpace: true },
  INR: { symbol: 'INR', code: 'INR', decimals: 2, useSpace: true },
  IQD: { symbol: 'IQD', code: 'IQD', decimals: 3, useSpace: true },
  IRR: { symbol: 'IRR', code: 'IRR', decimals: 2, useSpace: true },
  ISK: { symbol: 'ISK', code: 'ISK', decimals: 0, useSpace: true },
  JMD: { symbol: 'JMD', code: 'JMD', decimals: 2, useSpace: true },
  JOD: { symbol: 'JOD', code: 'JOD', decimals: 3, useSpace: true },
  KES: { symbol: 'KES', code: 'KES', decimals: 2, useSpace: true },
  KGS: { symbol: 'KGS', code: 'KGS', decimals: 2, useSpace: true },
  KHR: { symbol: 'KHR', code: 'KHR', decimals: 2, useSpace: true },
  KMF: { symbol: 'KMF', code: 'KMF', decimals: 0, useSpace: true },
  KPW: { symbol: 'KPW', code: 'KPW', decimals: 2, useSpace: true },
  KRW: { symbol: 'KRW', code: 'KRW', decimals: 0, useSpace: true },
  KWD: { symbol: 'KWD', code: 'KWD', decimals: 3, useSpace: true },
  KYD: { symbol: 'KYD', code: 'KYD', decimals: 2, useSpace: true },
  KZT: { symbol: 'KZT', code: 'KZT', decimals: 2, useSpace: true },
  LAK: { symbol: 'LAK', code: 'LAK', decimals: 2, useSpace: true },
  LBP: { symbol: 'LBP', code: 'LBP', decimals: 2, useSpace: true },
  LKR: { symbol: 'LKR', code: 'LKR', decimals: 2, useSpace: true },
  LRD: { symbol: 'LRD', code: 'LRD', decimals: 2, useSpace: true },
  LSL: { symbol: 'LSL', code: 'LSL', decimals: 2, useSpace: true },
  LYD: { symbol: 'LYD', code: 'LYD', decimals: 3, useSpace: true },
  MAD: { symbol: 'MAD', code: 'MAD', decimals: 2, useSpace: true },
  MDL: { symbol: 'MDL', code: 'MDL', decimals: 2, useSpace: true },
  MGA: { symbol: 'MGA', code: 'MGA', decimals: 2, useSpace: true },
  MKD: { symbol: 'MKD', code: 'MKD', decimals: 2, useSpace: true },
  MMK: { symbol: 'MMK', code: 'MMK', decimals: 2, useSpace: true },
  MNT: { symbol: 'MNT', code: 'MNT', decimals: 2, useSpace: true },
  MOP: { symbol: 'MOP', code: 'MOP', decimals: 2, useSpace: true },
  MRU: { symbol: 'MRU', code: 'MRU', decimals: 2, useSpace: true },
  MUR: { symbol: 'MUR', code: 'MUR', decimals: 2, useSpace: true },
  MVR: { symbol: 'MVR', code: 'MVR', decimals: 2, useSpace: true },
  MWK: { symbol: 'MWK', code: 'MWK', decimals: 2, useSpace: true },
  MXN: { symbol: 'MXN', code: 'MXN', decimals: 2, useSpace: true },
  MZN: { symbol: 'MZN', code: 'MZN', decimals: 2, useSpace: true },
  NAD: { symbol: 'NAD', code: 'NAD', decimals: 2, useSpace: true },
  NGN: { symbol: 'NGN', code: 'NGN', decimals: 2, useSpace: true },
  NIO: { symbol: 'NIO', code: 'NIO', decimals: 2, useSpace: true },
  NOK: { symbol: 'NOK', code: 'NOK', decimals: 2, useSpace: true },
  NPR: { symbol: 'NPR', code: 'NPR', decimals: 2, useSpace: true },
  NZD: { symbol: 'NZD', code: 'NZD', decimals: 2, useSpace: true },
  OMR: { symbol: 'OMR', code: 'OMR', decimals: 3, useSpace: true },
  PAB: { symbol: 'PAB', code: 'PAB', decimals: 2, useSpace: true },
  PEN: { symbol: 'PEN', code: 'PEN', decimals: 2, useSpace: true },
  PGK: { symbol: 'PGK', code: 'PGK', decimals: 2, useSpace: true },
  PHP: { symbol: 'PHP', code: 'PHP', decimals: 2, useSpace: true },
  PKR: { symbol: 'PKR', code: 'PKR', decimals: 2, useSpace: true },
  PLN: { symbol: 'PLN', code: 'PLN', decimals: 2, useSpace: true },
  PYG: { symbol: 'PYG', code: 'PYG', decimals: 0, useSpace: true },
  QAR: { symbol: 'QAR', code: 'QAR', decimals: 2, useSpace: true },
  RON: { symbol: 'RON', code: 'RON', decimals: 2, useSpace: true },
  RSD: { symbol: 'RSD', code: 'RSD', decimals: 2, useSpace: true },
  RUB: { symbol: 'RUB', code: 'RUB', decimals: 2, useSpace: true },
  RWF: { symbol: 'RWF', code: 'RWF', decimals: 0, useSpace: true },
  SAR: { symbol: 'SAR', code: 'SAR', decimals: 2, useSpace: true },
  SBD: { symbol: 'SBD', code: 'SBD', decimals: 2, useSpace: true },
  SCR: { symbol: 'SCR', code: 'SCR', decimals: 2, useSpace: true },
  SDG: { symbol: 'SDG', code: 'SDG', decimals: 2, useSpace: true },
  SEK: { symbol: 'SEK', code: 'SEK', decimals: 2, useSpace: true },
  SHP: { symbol: 'SHP', code: 'SHP', decimals: 2, useSpace: true },
  SLE: { symbol: 'SLE', code: 'SLE', decimals: 2, useSpace: true },
  SOS: { symbol: 'SOS', code: 'SOS', decimals: 2, useSpace: true },
  SRD: { symbol: 'SRD', code: 'SRD', decimals: 2, useSpace: true },
  SSP: { symbol: 'SSP', code: 'SSP', decimals: 2, useSpace: true },
  STN: { symbol: 'STN', code: 'STN', decimals: 2, useSpace: true },
  SVC: { symbol: 'SVC', code: 'SVC', decimals: 2, useSpace: true },
  SYP: { symbol: 'SYP', code: 'SYP', decimals: 2, useSpace: true },
  SZL: { symbol: 'SZL', code: 'SZL', decimals: 2, useSpace: true },
  THB: { symbol: 'THB', code: 'THB', decimals: 2, useSpace: true },
  TJS: { symbol: 'TJS', code: 'TJS', decimals: 2, useSpace: true },
  TMT: { symbol: 'TMT', code: 'TMT', decimals: 2, useSpace: true },
  TND: { symbol: 'TND', code: 'TND', decimals: 3, useSpace: true },
  TOP: { symbol: 'TOP', code: 'TOP', decimals: 2, useSpace: true },
  TRY: { symbol: 'TRY', code: 'TRY', decimals: 2, useSpace: true },
  TTD: { symbol: 'TTD', code: 'TTD', decimals: 2, useSpace: true },
  TWD: { symbol: 'TWD', code: 'TWD', decimals: 2, useSpace: true },
  TZS: { symbol: 'TZS', code: 'TZS', decimals: 2, useSpace: true },
  UAH: { symbol: 'UAH', code: 'UAH', decimals: 2, useSpace: true },
  UGX: { symbol: 'UGX', code: 'UGX', decimals: 0, useSpace: true },
  UYU: { symbol: 'UYU', code: 'UYU', decimals: 2, useSpace: true },
  UYW: { symbol: 'UYW', code: 'UYW', decimals: 4, useSpace: true },
  UZS: { symbol: 'UZS', code: 'UZS', decimals: 2, useSpace: true },
  VED: { symbol: 'VED', code: 'VED', decimals: 2, useSpace: true },
  VES: { symbol: 'VES', code: 'VES', decimals: 2, useSpace: true },
  VND: { symbol: 'VND', code: 'VND', decimals: 0, useSpace: true },
  VUV: { symbol: 'VUV', code: 'VUV', decimals: 0, useSpace: true },
  WST: { symbol: 'WST', code: 'WST', decimals: 2, useSpace: true },
  XAF: { symbol: 'XAF', code: 'XAF', decimals: 0, useSpace: true },
  XCD: { symbol: 'XCD', code: 'XCD', decimals: 2, useSpace: true },
  XOF: { symbol: 'XOF', code: 'XOF', decimals: 0, useSpace: true },
  XPF: { symbol: 'XPF', code: 'XPF', decimals: 0, useSpace: true },
  YER: { symbol: 'YER', code: 'YER', decimals: 2, useSpace: true },
  ZAR: { symbol: 'ZAR', code: 'ZAR', decimals: 2, useSpace: true },
  ZMW: { symbol: 'ZMW', code: 'ZMW', decimals: 2, useSpace: true },
  ZWG: { symbol: 'ZWG', code: 'ZWG', decimals: 2, useSpace: true }
};


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
