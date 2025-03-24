// Modified script.js with complete API integration
const API_URL = 'http://localhost:3000/api';

// Initialize arrays to store group members and expenses
let members = [];
let expenses = [];
let categories = [];
let tripMembers = [];
let initializationComplete = false;
let categoriesChart = null;


// Global variable to store trips
let trips = [];
let currentTripId = null;

// DOM Elements - Main Form
const memberNameInput = document.getElementById('member-name');
const addMemberBtn = document.getElementById('add-member-btn');
const membersList = document.getElementById('members-list');
const expenseForm = document.getElementById('expense-form');
const expenseDescription = document.getElementById('expense-description');
const expenseAmount = document.getElementById('expense-amount');
const expensePayer = document.getElementById('expense-payer');
const expenseDate = document.getElementById('expense-date');
const expenseParticipants = document.getElementById('expense-participants');
const splitType = document.getElementById('split-type');
const unequalSplitContainer = document.getElementById('unequal-split-container');
const expensesList = document.getElementById('expenses-list');
const balanceSummary = document.getElementById('balance-summary');
const settlementList = document.getElementById('settlement-list');

// DOM Elements - Edit Form
const editTransactionSection = document.getElementById('edit-transaction-section');
// const editExpenseForm = document.getElementById('edit-expense-form');
const editExpenseId = document.getElementById('edit-expense-id');
const editExpenseDescription = document.getElementById('edit-expense-description');
const editExpenseAmount = document.getElementById('edit-expense-amount');
const editExpensePayer = document.getElementById('edit-expense-payer');
const editExpenseDate = document.getElementById('edit-expense-date');
const editExpenseParticipants = document.getElementById('edit-expense-participants');
const cancelEditBtn = document.getElementById('cancel-edit');
const editSplitType = document.getElementById('edit-split-type');
const editUnequalSplitContainer = document.getElementById('edit-unequal-split-container');

// DOM Elements - Cash Outflow Summary
const cashOutflowsList = document.getElementById('cash-outflows-list');

// DOM Elements - User Expenses Section
const userSelector = document.getElementById('user-selector');
const userExpenseBody = document.getElementById('user-expense-body');
const grandTotalElement = document.getElementById('grand-total');
const noExpensesMessage = document.getElementById('no-expenses-message');
const userExpenseTable = document.getElementById('user-expense-table');

// DOM Elements - Cash Outflow History
const cashoutflowSelector = document.getElementById('cashoutflow-selector');
const cashoutflowBody = document.getElementById('cashoutflow-body');
const cashoutflowTotalElement = document.getElementById('cashoutflow-total');
const cashoutflowEmptyMessage = document.getElementById('cashoutflow-empty-message');

// DOM Elements - Expenses Table
const expensesDetailTable = document.getElementById('expenses-detail-table');
const expensesDetailBody = document.getElementById('expenses-detail-body');
const expensesDetailTotal = document.getElementById('expenses-detail-total');
const noExpensesDetailMessage = document.getElementById('no-expenses-detail-message');

// DOM Elements - Expenses List
const expensesListTable = document.getElementById('expenses-list-table');
const expensesListBody = document.getElementById('expenses-list-body');
const expensesListTotal = document.getElementById('expenses-list-total');
const noExpensesListMessage = document.getElementById('no-expenses-list-message');

// Function to format numbers as currency
function formatCurrency(number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(number);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the trip page
  await initializeTripFromUrl();
});

// InitializeTripFromUrl function:
async function initializeTripFromUrl() {
  const path = window.location.pathname;
  const tripUrlMatch = path.match(/\/trip\/([^\/]+)/);
  
  if (!tripUrlMatch || !tripUrlMatch[1]) {
    showErrorPage("Invalid trip URL");
    return false;
  }
  
  const tripUrlId = tripUrlMatch[1];
  
  // Define tripUrl here, before using it
  const tripUrl = window.location.origin + '/trip/' + tripUrlId;
  
  try {
    // Clear all existing data first
    expenses = [];
    tripMembers = [];
    
    const response = await fetch(`${API_URL}/trips/${tripUrlId}`);
    if (!response.ok) {
      showErrorPage("Trip not found");
      return false;
    }
    
    const trip = await response.json();
    if (!trip || !trip.id) {
      showErrorPage("Invalid trip data");
      return false;
    }
    
    currentTripId = trip.id;
    
    // Update the header with the trip name immediately
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
      headerTitle.textContent = trip.name;
    }
	
	// Add the trip URL to the header
    const tripUrlElement = document.getElementById('trip-url');
    if (tripUrlElement) {
      tripUrlElement.textContent = `Share URL: ${tripUrl}`;
    }
	
    document.title = `${trip.name || 'Trip'} - Bill Splitter`;
    
    // Set up navigation buttons event listeners
    setupNavigation();
    
    // Load trip data
    await Promise.all([
      loadTripMembers(trip.id),
      loadTripExpenses(trip.id),
      loadCategories()
    ]);
    

	// Mark initialization as complete
    initializationComplete = true;
    
    return true;
  } catch (error) {
    console.error("Error loading trip:", error);
    showErrorPage("Failed to load trip data");
    return false;
  }
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Only process clicks if initialization is complete
      if (initializationComplete) {
        showTripSection(btn.dataset.section);
      } else {
        console.log('Initialization not complete, ignoring section change');
      }
    });
  });
  
  // Set up other listeners
  setupSelectorListeners();
}



function setupSelectorListeners() {
  if (userSelector) {
    userSelector.addEventListener('change', updateUserExpenseHistory);
  }
  if (cashoutflowSelector) {
    cashoutflowSelector.addEventListener('change', updateCashOutflowHistory);
  }
}



function showTripSection(sectionName) {
  // Log the section name being navigated to (from first function)
  console.log('Navigating to section:', sectionName);

  // Hide all trip-specific sections (from both functions)
  document.querySelectorAll('.trip-specific').forEach(el => {
    el.style.display = 'none';
    console.log(`Hiding section: ${el.id}, Display: ${el.style.display}`);
  });

  // Show the selected section (comprehensive switch from first function)
  switch (sectionName) {
    case 'balance':
      document.getElementById('balance-section').style.display = 'block';
      console.log('Displaying Balance Section');
      break;
    case 'members':
      document.getElementById('group-section').style.display = 'block';
      console.log('Displaying Members Section');
      break;
    case 'expenses':
      document.getElementById('expense-section').style.display = 'block';
      console.log('Displaying Expenses Section');
      if (categories.length === 0) {
        loadCategories();
        console.log('Loading categories for Expenses Section');
      } else {
        populateCategoryDropdowns();
        console.log('Populating category dropdowns for Expenses Section');
      }
      break;
    case 'expenses-list':
      document.getElementById('expenses-list-section').style.display = 'block';
      console.log('Displaying Expenses List Section');
      break;
	case 'detailed-expenses':
	  document.getElementById('detailed-expenses-section').style.display = 'block';
	  console.log('Displaying Detailed Expenses Section');
	  updateDetailedExpensesUI();
	  break;
    case 'cash-outflows':
      document.getElementById('cash-outflows-section').style.display = 'block';
      console.log('Displaying Cash Outflows Section');
      break;
    case 'user-expenses':
      document.getElementById('individual-expense-history-section').style.display = 'block';
      console.log('Displaying Individual Expense History Section');
      break;
    case 'cashoutflow-history':
      document.getElementById('individual-cash-outflow-history-section').style.display = 'block';
      console.log('Displaying Individual Cash Outflow History Section');
      break;
    case 'expenses-table':
      document.getElementById('expenses-table-section').style.display = 'block';
      console.log('Displaying Expenses Table Section');
      break;
    case 'expense-distribution':
      document.getElementById('expense-distribution-chart').style.display = 'block';
      console.log('Displaying Expense Distribution Chart');
      // Call chart generation function
      generateMemberExpensePieChart(true);
      break;
	case 'categories':
	  document.getElementById('categories-chart-section').style.display = 'block';
	  console.log('Displaying Categories Chart');
	  generateCategoriesPieChart(true);
	  break;
    case 'edit': // Case for Edit Transaction Section
      const editSection = document.getElementById('edit-transaction-section');
      // Ensure visibility of Edit Transaction Section
      editSection.classList.remove('hidden');
      editSection.style.display = 'block';
      // Force visibility as a fallback mechanism
      editSection.style.visibility = 'visible';
      editSection.style.opacity = '1';
      console.log('Displaying Edit Transaction Section');
      break;
    default:
      console.error(`Unknown section: ${sectionName}`);
  }

  // Update active button styles (from both functions)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.dataset.section === sectionName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Log active button styles update (from first function)
  console.log(`Updated active button for section: ${sectionName}`);
}



function showErrorPage(message) {
  // Hide all content
  document.querySelectorAll('.main-page, .trip-specific').forEach(el => el.style.display = 'none');
  // Show error message
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}



// New function to load trip members
async function loadTripMembers(tripId) {
  try {
    const response = await fetch(`${API_URL}/trips/${tripId}/members`);
    if (response.ok) {
      tripMembers = await response.json();
      members = tripMembers; // Ensure members is updated with trip-specific data
      updateMembersUI();
      updateSelectors();
      updateUserExpenseHistory(); // Ensure user expense history updates
    } else {
      console.error("Failed to load trip members");
      tripMembers = [];
      members = []; // Reset members if loading fails
    }
  } catch (error) {
    console.error("Error loading trip members:", error);
    tripMembers = [];
    members = []; // Reset members on error
  }
}


// Function to load expenses for a specific trip
async function loadTripExpenses(tripId) {
  try {
    const response = await fetch(`${API_URL}/trips/${tripId}/expenses`);
    if (response.ok) {
      expenses = await response.json();
      updateExpensesList();
      updateExpensesTable();
      generateMemberExpensePieChart();
      calculateBalances();
      await calculateCashOutflows();
	  updateUserExpenseHistory(); 
    } else {
      console.error("Failed to load trip expenses");
      expenses = [];
    }
  } catch (error) {
    console.error("Error loading trip expenses:", error);
    expenses = [];
  }
}



// Load data from server via API
async function loadData() {
  try {
    // Only fetch trip-specific data if we have a trip ID
    if (currentTripId) {
      // Fetch expenses for the current trip
      const expensesResponse = await fetch(`${API_URL}/trips/${currentTripId}/expenses`);
      if (expensesResponse.ok) {
        expenses = await expensesResponse.json();
        updateExpensesList();
        updateExpensesTable();
        generateMemberExpensePieChart();
        calculateBalances();
        await calculateCashOutflows();
      } else {
        console.error("Failed to load trip expenses");
        expenses = [];
      }

      // Load trip members
      await loadTripMembers(currentTripId);
    }

    // Load categories (needed for both trip and non-trip views)
    await loadCategories();

    // Fetch trips list (for navigation purposes)
    const tripsResponse = await fetch(`${API_URL}/trips`);
    if (tripsResponse.ok) {
      trips = await tripsResponse.json();
      
      // Only update trips UI if we're on the main page
      if (document.getElementById('trips-list')) {
        updateTripsUI();
      }
    } else {
      console.error("Failed to load trips");
      trips = [];
    }
  } catch (error) {
    console.error("Error loading data:", error);
    // Initialize with empty arrays if loading fails
    expenses = [];
    trips = [];
    
    // Only toggle trip management if we're on the main page
    const tripManagementSection = document.getElementById('trip-management-section');
    if (tripManagementSection) {
      tripManagementSection.style.display = 'block';
    }
  }
}


// Add new member via API
async function addMember() {
  const name = memberNameInput.value.trim();
  if (name === '') {
    alert('Please enter a name');
    return;
  }
  
  if (tripMembers.includes(name)) {
    alert('This member already exists');
    return;
  }
  
  try {
    if (currentTripId) {
      // Add to specific trip
      const response = await fetch(`${API_URL}/trips/${currentTripId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      
      if (response.ok) {
        tripMembers.push(name);
        memberNameInput.value = '';
        updateMembersUI();
        updateSelectors();
      } else {
        alert('Failed to add member to trip');
      }
    }
  } catch (error) {
    console.error("Error adding member:", error);
    alert('Failed to connect to server');
  }
}

// Remove member via API
async function removeMember(index) {
  const name = tripMembers[index];
  
  try {
    // Now we remove from trip_members instead of members
    const response = await fetch(`${API_URL}/trips/${currentTripId}/members/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      tripMembers.splice(index, 1);
      updateMembersUI();
      updateSelectors();
    } else {
      alert('Failed to remove member');
    }
  } catch (error) {
    console.error("Error removing member:", error);
    alert('Failed to connect to server');
  }
}

// Add new expense via API
async function addExpense(e) {
    e.preventDefault();

    // Store current selections before form reset
    const currentUserSelection = userSelector.value;
    const currentCashoutflowSelection = cashoutflowSelector.value;

    const description = expenseDescription.value.trim();
    const amount = parseFloat(expenseAmount.value);
    const payer = expensePayer.value;
    const date = expenseDate.value;
    const category = document.getElementById('expense-category').value; // New category field

    if (!description || isNaN(amount) || amount <= 0 || !payer || !date) {
        alert('Please fill out all fields with valid values');
        return;
    }

    // Get selected participants
    const participants = [];
    expenseParticipants.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        participants.push(checkbox.value);
    });

    if (participants.length === 0) {
        alert('Please select at least one participant');
        return;
    }

    // Calculate shares based on split type
    let shares = {};
    if (splitType.value === 'equal') {
        const equalShare = amount / participants.length;
        participants.forEach(participant => {
            shares[participant] = equalShare;
        });
    } else {
        // For unequal split, get values from the generated inputs
        let totalShares = 0;
        participants.forEach(participant => {
            const shareInput = document.getElementById(`share-${participant}`);
            const share = parseFloat(shareInput.value);

            if (isNaN(share) || share < 0) {
                alert(`Please enter a valid share amount for ${participant}`);
                return;
            }

            shares[participant] = share;
            totalShares += share;
        });

        // Validate total shares
        if (Math.abs(totalShares - amount) > 0.01) {
            alert(`The sum of shares (${totalShares.toFixed(2)}) must equal the total amount (${amount.toFixed(2)})`);
            return;
        }
    }

    const expense = {
        description,
        amount,
        payer,
        date,
        category,
        participants,
        shares,
		trip_id: currentTripId  // Add this line
    };

    try {
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        });

        if (response.ok) {
            const result = await response.json();
            expense.id = result.id;
            expenses.push(expense);

            // Clear form
            expenseForm.reset();
            unequalSplitContainer.innerHTML = '';
            unequalSplitContainer.classList.add('hidden');
            expenseDate.value = new Date().toISOString().split('T')[0];

            updateMembersUI();
			updateDetailedExpensesUI();
            updateExpensesList();
            updateExpensesTable();
            generateMemberExpensePieChart();
            calculateBalances();
            calculateCashOutflows();

            // Restore previous selections and update data
            if (currentUserSelection) {
                userSelector.value = currentUserSelection;
                updateUserExpenseHistory();
            }

            if (currentCashoutflowSelection) {
                cashoutflowSelector.value = currentCashoutflowSelection;
                updateCashOutflowHistory();
            }
			
			alert('New expense has been created successfully!');
			
        } else {
            alert('Failed to add expense');
        }
    } catch (error) {
        console.error("Error adding expense:", error);
        alert('Failed to connect to server');
    }
}

// Remove expense via API
async function removeExpense(expenseId) {
    const expenseIndex = expenses.findIndex(e => e.id === Number(expenseId));
    if (expenseIndex === -1) {
        console.error('Expense not found:', expenseId);
        return;
    }
    const expense = expenses[expenseIndex];

    try {
        const response = await fetch(`${API_URL}/expenses/${expense.id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            expenses.splice(expenseIndex, 1);
            updateDetailedExpensesUI();
            updateExpensesList();
            updateExpensesTable();
            generateMemberExpensePieChart();
            calculateBalances();
            calculateCashOutflows();

            // Update user-specific views if necessary
            if (userSelector && userSelector.value) {
                updateUserExpenseHistory();
            }
            if (cashoutflowSelector && cashoutflowSelector.value) {
                updateCashOutflowHistory();
            }

            alert('Expense has been removed successfully!');
        } else {
            alert('Failed to remove expense');
        }
    } catch (error) {
        console.error("Error removing expense:", error);
        alert('Failed to connect to server');
    }
}


function openEditForm(expenseId) {
  console.log('Expenses:', expenses);
  const expense = expenses.find(e => e.id === Number(expenseId));
  if (!expense) {
    console.error('Expense not found for ID:', expenseId);
    return;
  }
  // Populate form fields
  editExpenseId.value = expense.id;
  editExpenseDescription.value = expense.description;
  editExpenseAmount.value = expense.amount;
  editExpensePayer.value = expense.payer;
  document.getElementById('edit-expense-category').value = expense.category || '';

  // Set date
  if (expense.date) {
    const dateObj = new Date(expense.date);
    editExpenseDate.value = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : expense.date;
  }

  // Set participants checkboxes
  const checkboxes = editExpenseParticipants.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = expense.participants.includes(checkbox.value);
  });

  // Set split type
  const equalShare = expense.amount / expense.participants.length;
  const isEqualSplit = expense.participants.every(p => Math.abs(expense.shares[p] - equalShare) < 0.01);
  editSplitType.value = isEqualSplit ? 'equal' : 'unequal';

  if (editSplitType.value === 'unequal') {
    showEditUnequalSplitInputs(expense);
  } else {
    editUnequalSplitContainer.classList.add('hidden');
    editUnequalSplitContainer.innerHTML = '';
  }

  // Navigate to edit section
  showTripSection('edit');
}





// Show unequal split inputs in edit form
function showEditUnequalSplitInputs(expense) {
    editUnequalSplitContainer.innerHTML = '';
    editUnequalSplitContainer.classList.remove('hidden');

    expense.participants.forEach(participant => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="edit-share-${participant}">${participant}'s Share:</label>
            <input type="number" id="edit-share-${participant}" value="${expense.shares[participant]}" step="0.01" min="0">
        `;
        editUnequalSplitContainer.appendChild(div);
    });
}

// Submit edited expense via API
async function submitEditExpense(e) {
    e.preventDefault();

    // Store current selections before updating UI
    const currentUserSelection = userSelector.value;
    const currentCashoutflowSelection = cashoutflowSelector.value;

    const id = editExpenseId.value;
    const description = editExpenseDescription.value.trim();
    const amount = parseFloat(editExpenseAmount.value);
    const payer = editExpensePayer.value;
    const date = editExpenseDate.value;
    const category = document.getElementById('edit-expense-category').value; // Get category

    if (!description || isNaN(amount) || amount <= 0 || !payer || !date) {
        alert('Please fill out all fields with valid values');
        return;
    }

    // Get participants
    const participants = [];
    const checkboxes = editExpenseParticipants.querySelectorAll('input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        participants.push(checkbox.value);
    });

    if (participants.length === 0) {
        alert('Please select at least one participant');
        return;
    }

    // Calculate shares
    let shares = {};
    if (editSplitType.value === 'equal') {
        const equalShare = amount / participants.length;
        participants.forEach(participant => {
            shares[participant] = equalShare;
        });
    } else {
        // For unequal split, get values from the generated inputs
        let totalShares = 0;
        participants.forEach(participant => {
            const shareInput = document.getElementById(`edit-share-${participant}`);
            const share = parseFloat(shareInput.value);

            if (isNaN(share) || share < 0) {
                alert(`Please enter a valid share amount for ${participant}`);
                return;
            }

            shares[participant] = share;
            totalShares += share;
        });

        // Validate total shares
        if (Math.abs(totalShares - amount) > 0.01) {
            alert(`The sum of shares (${totalShares.toFixed(2)}) must equal the total amount (${amount.toFixed(2)})`);
            return;
        }
    }

    const updatedExpense = {
        id: Number(id),
        description,
        amount,
        payer,
        date,
        category,
        participants,
        shares
    };

    try {
        const response = await fetch(`${API_URL}/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedExpense)
        });

        if (response.ok) {
            // Update local array
            const index = expenses.findIndex(exp => exp.id == id);
            if (index !== -1) {
                expenses[index] = updatedExpense;
            }

            // Update UI
			updateDetailedExpensesUI();
            updateExpensesList();
            updateExpensesTable();
            generateMemberExpensePieChart();
            calculateBalances();
            calculateCashOutflows();

            // Restore previous selections and update data
            if (currentUserSelection) {
                userSelector.value = currentUserSelection;
                updateUserExpenseHistory();
            }

            if (currentCashoutflowSelection) {
                cashoutflowSelector.value = currentCashoutflowSelection;
                updateCashOutflowHistory();
            }
			
			// Close the modal
			document.getElementById('editExpenseModal').classList.add('hidden');
			
			alert('Expense has been updated successfully!');
			
			
        } else {
            alert('Failed to update expense');
        }
    } catch (error) {
        console.error("Error updating expense:", error);
        alert('Failed to connect to server');
    }
}

// Function to show unequal split inputs in the add form
function showUnequalSplitInputs() {
    const checkedParticipants = Array.from(
        expenseParticipants.querySelectorAll('input[type="checkbox"]:checked')
    ).map(checkbox => checkbox.value);

    if (checkedParticipants.length === 0) {
        alert('Please select at least one participant');
        splitType.value = 'equal';
        return;
    }

    unequalSplitContainer.innerHTML = '';
    unequalSplitContainer.classList.remove('hidden');

    const amount = parseFloat(expenseAmount.value) || 0;
    const equalShare = amount / checkedParticipants.length;

    checkedParticipants.forEach(participant => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="share-${participant}">${participant}'s Share:</label>
            <input type="number" id="share-${participant}" value="${equalShare.toFixed(2)}" step="0.01" min="0">
        `;
        unequalSplitContainer.appendChild(div);
    });
}

// Update Members UI
function updateMembersUI() {
    membersList.innerHTML = '';
    const relevantMembers = currentTripId ? tripMembers : members;

    if (relevantMembers.length === 0) {
        membersList.innerHTML = '<div>No members added yet</div>';
    } else {
        relevantMembers.forEach((member, index) => {
            const memberItem = document.createElement('div');
            memberItem.className = 'list-item';

            // Create span for member name
            const memberSpan = document.createElement('span');
            memberSpan.textContent = member;

            // Create remove button
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-btn';
            removeButton.textContent = 'Remove';

            // Add event listener
            removeButton.addEventListener('click', function() {
                if (currentTripId) {
                    removeTripMember(currentTripId, member);
                } else {
                    removeMember(index);
                }
            });

            // Append elements to the member item
            memberItem.appendChild(memberSpan);
            memberItem.appendChild(removeButton);
            membersList.appendChild(memberItem);
        });
    }
	
	
    updateExpenseFormDropdowns();

    // Update User Selector Dropdown with Default Option
    userSelector.innerHTML = '<option value="" disabled selected>Choose a user</option>';
    relevantMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        userSelector.appendChild(option);
    });

    // Update Cash Outflow Selector Dropdown with Default Option
    cashoutflowSelector.innerHTML = '<option value="" disabled selected>Choose a user</option>';
    relevantMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        cashoutflowSelector.appendChild(option);
    });

    // Check all checkboxes after they are populated
    const checkboxes = expenseParticipants.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

async function removeTripMember(tripId, memberName) {
  try {
    const response = await fetch(`${API_URL}/trips/${tripId}/members/${encodeURIComponent(memberName)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // Remove the member from the tripMembers array
      const index = tripMembers.indexOf(memberName);
      if (index > -1) {
        tripMembers.splice(index, 1);
      }
      
      // Update the UI
      updateMembersUI();
      updateSelectors(); // Add this line
      // Optionally, update other UI components that might be affected
      updateExpenseFormDropdowns();
      calculateBalances();
      await calculateCashOutflows();
    } else {
      alert('Failed to remove member from trip');
    }
  } catch (error) {
    console.error("Error removing trip member:", error);
    alert('Failed to connect to server');
  }
}


// Update expense form dropdowns
function updateExpenseFormDropdowns() {
    const relevantMembers = currentTripId ? tripMembers : members;

    // Update payer dropdown
    expensePayer.innerHTML = '';
    relevantMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        expensePayer.appendChild(option);
    });

    // Update expense participants checkboxes
    expenseParticipants.innerHTML = '';
    relevantMembers.forEach(member => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <input type="checkbox" id="participant-${member}" name="participants" value="${member}" checked>
            <label for="participant-${member}">${member}</label>
        `;
        expenseParticipants.appendChild(checkboxItem);
    });

    // Update edit expense form dropdowns
    if (editExpensePayer) {
        editExpensePayer.innerHTML = '';
        relevantMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.textContent = member;
            editExpensePayer.appendChild(option);
        });
    }

    // Update edit participants checkboxes
    if (editExpenseParticipants) {
        editExpenseParticipants.innerHTML = '';
        relevantMembers.forEach(member => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            checkboxItem.innerHTML = `
                <input type="checkbox" id="edit-participant-${member}" name="edit-participants" value="${member}" checked>
                <label for="edit-participant-${member}">${member}</label>
            `;
            editExpenseParticipants.appendChild(checkboxItem);
        });
    }
}



// Update the user selector dropdown
function updateUserSelector() {
    if (!userSelector) return;

    userSelector.innerHTML = '';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        userSelector.appendChild(option);
    });
}

// Update the cashoutflow selector dropdown
function updateCashoutflowSelector() {
    if (!cashoutflowSelector) return;

    cashoutflowSelector.innerHTML = '';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        cashoutflowSelector.appendChild(option);
    });
}


function updateSelectors() {
  const relevantMembers = currentTripId ? tripMembers : members;
  
  // Update dropdown options for all selectors
  updateSelectorOptions(userSelector, relevantMembers);
  updateSelectorOptions(cashoutflowSelector, relevantMembers);
  updateSelectorOptions(expensePayer, relevantMembers);
  updateSelectorOptions(editExpensePayer, relevantMembers);
  
  // Reattach change event listeners using the onchange property
  if (userSelector) {
    userSelector.onchange = updateUserExpenseHistory;
  }
  if (cashoutflowSelector) {
    cashoutflowSelector.onchange = updateCashOutflowHistory;
  }
  updateUserExpenseHistory();
}


function updateSelectorOptions(selector, options) {
  const currentValue = selector.value;
  selector.innerHTML = '<option value="" disabled selected>Choose a user</option>';
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    selector.appendChild(optionElement);
  });
  if (options.includes(currentValue)) {
    selector.value = currentValue;
  }
}


// Calculate and display balances
function calculateBalances() {
  if (expenses.length === 0) {
    balanceSummary.innerHTML = '<div>... No balances to calculate</div>';
    settlementList.innerHTML = '<div>... No settlements needed</div>';
    return;
  }

  // Use tripMembers if a trip is active; otherwise, use the global members array
  const relevantMembers = currentTripId ? tripMembers : members;
  
  let balances = {};
  // Initialize balances only for the relevant members
  relevantMembers.forEach(member => {
    balances[member] = 0;
  });

  // Calculate net balance for each member from expenses
  expenses.forEach(expense => {
    // Add full expense amount to the payer's balance
    balances[expense.payer] += expense.amount;
    // Subtract each participant's share from their balance
    expense.participants.forEach(participant => {
      balances[participant] -= expense.shares[participant];
    });
  });

  // Generate the balance table rows using the relevant member list
  let tableRows = '';
  relevantMembers.forEach(member => {
    const balance = balances[member];
    const balanceClass = balance > 0 ? 'positive-balance' : balance < 0 ? 'negative-balance' : '';
    tableRows += `
      <tr>
        <td>${member}</td>
        <td class="${balanceClass}">${formatCurrency(balance)}</td>
      </tr>
    `;
  });

  balanceSummary.innerHTML = `
    <table class="summary-table">
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  // Call calculateSettlements with both balances and relevantMembers
  calculateSettlements(balances, relevantMembers);
}

function calculateSettlements(balances, relevantMembers) {
  // Determine creditors and debtors using the relevant member list
  const creditors = relevantMembers.filter(member => balances[member] > 0)
    .sort((a, b) => balances[b] - balances[a]);
  const debtors = relevantMembers.filter(member => balances[member] < 0)
    .sort((a, b) => balances[a] - balances[b]);

  let settlements = [];

  // Process each debtor to pay off creditors until debts are resolved
  if (creditors.length > 0 && debtors.length > 0) {
    debtors.forEach(debtor => {
      let debtAmount = Math.abs(balances[debtor]);
      creditors.forEach(creditor => {
        if (debtAmount > 0 && balances[creditor] > 0) {
          const payment = Math.min(debtAmount, balances[creditor]);
          settlements.push({
            from: debtor,
            to: creditor,
            amount: payment
          });
          debtAmount -= payment;
          balances[creditor] -= payment;
        }
      });
    });
  }

  // Update the settlement plan in the UI
  if (settlements.length === 0) {
    settlementList.innerHTML = '<div>Everyone is settled up!</div>';
  } else {
    let settlementRows = '';
    settlements.forEach(settlement => {
      settlementRows += `
        <tr>
          <td>${settlement.from} pays ${settlement.to}</td>
          <td>${formatCurrency(settlement.amount)}</td>
        </tr>
      `;
    });
    settlementList.innerHTML = `
      <table class="summary-table">
        <tbody>
          ${settlementRows}
        </tbody>
      </table>
    `;
  }
}


// Calculate and display cash outflows
async function calculateCashOutflows() {
    if (!cashOutflowsList) return;

    try {
        // Construct the URL with the currentTripId
        const url = currentTripId 
            ? `${API_URL}/cash-outflows?trip_id=${currentTripId}` 
            : `${API_URL}/cash-outflows`;

        // Fetch cash outflows data from the API
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch cash outflows: ${response.status}`);
        }

        const cashOutflows = await response.json();

        // Update cash outflows UI
        cashOutflowsList.innerHTML = '';

        if (cashOutflows.length === 0) {
            cashOutflowsList.innerHTML = '<tr><td colspan="3">No cash outflow data available for this trip</td></tr>';
            return;
        }

        // Display each member's cash outflow data
        cashOutflows.forEach(outflow => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${outflow.member_name}</td>
                <td>${formatCurrency(parseFloat(outflow.total_expenditure))}</td>
                <td>${formatCurrency(parseFloat(outflow.total_cash_outflow))}</td>
            `;
            cashOutflowsList.appendChild(row);
        });

        // Call function to populate the grand totals in the table
        updateCashOutflowSummaryTotals();
    } catch (error) {
        console.error('Error calculating cash outflows:', error);
        cashOutflowsList.innerHTML = '<tr><td colspan="3">Error loading cash outflow data</td></tr>';
    }
}


// Update user expense history
function updateUserExpenseHistory() {
    if (!userSelector || !userExpenseBody || !grandTotalElement || !userExpenseTable || !noExpensesMessage) {
        return;
    }

    const selectedUser = userSelector.value;

    if (!selectedUser) {
        // Reset display if no user selected
        userExpenseTable.classList.add('hidden');
        noExpensesMessage.classList.remove('hidden');
        grandTotalElement.textContent = formatCurrency(0); // Reset total
        return;
    }

    // Filter expenses for the selected user
    const userExpenses = expenses.filter(expense => expense.participants.includes(selectedUser));

    // Chronological sorting code here
    userExpenses.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (userExpenses.length === 0) {
        userExpenseTable.classList.add('hidden');
        noExpensesMessage.classList.remove('hidden');
        grandTotalElement.textContent = formatCurrency(0); // Reset total
        return;
    }

    userExpenseTable.classList.remove('hidden');
    noExpensesMessage.classList.add('hidden');

    // Clear and populate the table
    userExpenseBody.innerHTML = '';
    let grandTotal = 0;

    userExpenses.forEach(expense => {
        const row = document.createElement('tr');
        const share = expense.shares[selectedUser] || 0; // Use 0 if undefined

        // Only add if it's a valid number
        if (!isNaN(share)) {
            grandTotal += share;
        }

        row.innerHTML = `
            <td>${expense.date.split('T')[0]}</td>
            <td>${expense.description}</td>
            <td>${formatCurrency(share)}</td>
        `;

        userExpenseBody.appendChild(row);
    });

    // Update the grand total display
    grandTotalElement.textContent = formatCurrency(grandTotal);
}

// Update cash outflow history
function updateCashOutflowHistory() {
    if (!cashoutflowSelector || !cashoutflowBody || !cashoutflowTotalElement || !cashoutflowEmptyMessage) {
        return;
    }

    const selectedUser = cashoutflowSelector.value;

    // Filter expenses where the selected user is the payer
    const userOutflows = expenses.filter(expense => expense.payer === selectedUser);

    // Sort by chronological order
    userOutflows.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (userOutflows.length === 0) {
        document.getElementById('cashoutflow-table').classList.add('hidden');
        cashoutflowEmptyMessage.classList.remove('hidden');
        return;
    }

    document.getElementById('cashoutflow-table').classList.remove('hidden');
    cashoutflowEmptyMessage.classList.add('hidden');

    // Clear and populate the table
    cashoutflowBody.innerHTML = '';
    let total = 0;

    userOutflows.forEach(expense => {
        const row = document.createElement('tr');
        total += expense.amount;

        row.innerHTML = `
            <td>${expense.date.split('T')[0]}</td>
            <td>${expense.description}</td>
            <td>${formatCurrency(expense.amount)}</td>
        `;

        cashoutflowBody.appendChild(row);
    });

    cashoutflowTotalElement.textContent = formatCurrency(total);
}

function updateCashOutflowSummaryTotals() {
    const expenditureTotal = document.getElementById('cashoutflow-summary-expenditure-total');
    const outflowTotal = document.getElementById('cashoutflow-summary-outflow-total');

    let totalExpenditure = 0;
    let totalOutflow = 0;

    // Loop through all members in the summary table
    const rows = document.querySelectorAll('.cashoutflow-summary-table tbody tr');
    rows.forEach(row => {
        totalExpenditure += parseFloat(row.cells[1].textContent.replace(/[^0-9.-]+/g, '') || 0);
        totalOutflow += parseFloat(row.cells[2].textContent.replace(/[^0-9.-]+/g, '') || 0);
    });

    // Update the totals
    expenditureTotal.textContent = formatCurrency(totalExpenditure);
    outflowTotal.textContent = formatCurrency(totalOutflow);
}

// Function to update the expenses table
function updateExpensesTable() {
    // Clear existing table content
    const headerRow = expensesDetailTable.querySelector('thead tr');

    // Keep only the first 4 columns (Date, Description, Amount, Paid By)
    while (headerRow.children.length > 4) {
        headerRow.removeChild(headerRow.lastChild);
    }

    // Clear body rows
    expensesDetailBody.innerHTML = '';

    // If no expenses, show message and return
    if (expenses.length === 0) {
        noExpensesDetailMessage.classList.remove('hidden');
        expensesDetailTable.classList.add('hidden');
        return;
    }

    // Hide message and show table
    noExpensesDetailMessage.classList.add('hidden');
    expensesDetailTable.classList.remove('hidden');

    // Get unique participants from all expenses
    const uniqueParticipants = new Set();
    expenses.forEach(expense => {
        expense.participants.forEach(participant => {
            uniqueParticipants.add(participant);
        });
    });

    // Convert to array and sort alphabetically
    const sortedParticipants = Array.from(uniqueParticipants).sort((a, b) => a.localeCompare(b));

    // Add columns for each participant (expenditure and outflow)
    sortedParticipants.forEach(participant => {
        // Add expenditure column
        const expHeader = document.createElement('th');
        expHeader.textContent = `${participant} (Exp)`;
        headerRow.appendChild(expHeader);

        // Add outflow column
        const outflowHeader = document.createElement('th');
        outflowHeader.textContent = `${participant} (Out)`;
        headerRow.appendChild(outflowHeader);
    });

    // Sort expenses by date (chronological order)
    const sortedExpenses = [...expenses].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });

    // Initialize totals object for each participant
    const totals = {
        amount: 0
    };
    sortedParticipants.forEach(participant => {
        totals[`${participant}_exp`] = 0;
        totals[`${participant}_out`] = 0;
    });

    // Add rows for each expense
    sortedExpenses.forEach(expense => {
        const row = document.createElement('tr');

        // Use the date string directly
        const formattedDate = expense.date.split('T')[0];

        // Add basic expense info
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${expense.description}</td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${expense.payer}</td>
        `;

        // Update total amount
        totals.amount += expense.amount;

        // Add columns for each participant
        sortedParticipants.forEach(participant => {
            // Expenditure column (negative values)
            const expCell = document.createElement('td');
            if (expense.participants.includes(participant)) {
                const share = expense.shares[participant] || 0;
                if (share > 0) {
                    expCell.textContent = formatCurrency(-share);
                    expCell.className = 'negative-amount';
                    totals[`${participant}_exp`] -= share;
                } else {
                    expCell.textContent = formatCurrency(0);
                }
            } else {
                expCell.textContent = formatCurrency(0);
            }
            row.appendChild(expCell);

            // Outflow column (positive values)
            const outflowCell = document.createElement('td');
            if (participant === expense.payer) {
                outflowCell.textContent = formatCurrency(expense.amount);
                outflowCell.className = 'positive-amount';
                totals[`${participant}_out`] += expense.amount;
            } else {
                outflowCell.textContent = formatCurrency(0);
            }
            row.appendChild(outflowCell);
        });

        expensesDetailBody.appendChild(row);
    });

    // Update totals row
    // First, clear the entire row
    expensesDetailTotal.innerHTML = '';

    // Add the "Grand Total" cell that only spans the first column
    const totalLabelCell = document.createElement('td');
    // Remove the colSpan attribute so it only takes up one cell
    totalLabelCell.innerHTML = '<strong>Grand Total:</strong>';
    expensesDetailTotal.appendChild(totalLabelCell);

    // Add an empty cell for the second column
    const emptyCell = document.createElement('td');
    expensesDetailTotal.appendChild(emptyCell);

    // Add the amount total cell
    const amountTotalCell = document.createElement('td');
    amountTotalCell.textContent = formatCurrency(totals.amount);
    expensesDetailTotal.appendChild(amountTotalCell);

    // Add the empty "Paid By" cell
    const emptyPaidByCell = document.createElement('td');
    expensesDetailTotal.appendChild(emptyPaidByCell);

    // Add totals for each participant
    sortedParticipants.forEach(participant => {
        // Expenditure total
        const expTotalCell = document.createElement('td');
        expTotalCell.textContent = formatCurrency(totals[`${participant}_exp`]);
        if (totals[`${participant}_exp`] < 0) {
            expTotalCell.className = 'negative-amount';
        }
        expensesDetailTotal.appendChild(expTotalCell);

        // Outflow total
        const outflowTotalCell = document.createElement('td');
        outflowTotalCell.textContent = formatCurrency(totals[`${participant}_out`]);
        if (totals[`${participant}_out`] > 0) {
            outflowTotalCell.className = 'positive-amount';
        }
        expensesDetailTotal.appendChild(outflowTotalCell);
    });
}

// Function to update the expenses list table
function updateExpensesList() {
    if (!expensesListBody) return;

    expensesListBody.innerHTML = '';

    if (expenses.length === 0) {
        expensesListTable.classList.add('hidden');
        noExpensesListMessage.classList.remove('hidden');
        return;
    }

    expensesListTable.classList.remove('hidden');
    noExpensesListMessage.classList.add('hidden');

    // Sort expenses by date in chronological order (oldest to newest)
    const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalAmount = 0;

    sortedExpenses.forEach((expense) => {
        const row = document.createElement('tr');

        // Format date as YYYY-MM-DD using split method
        const formattedDate = expense.date.split('T')[0];

        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${expense.description}</td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${expense.payer}</td>
            <td><button class="action-btn edit-btn" data-expense-id="${expense.id}">Edit</button></td>
            <td><button class="action-btn remove-btn" data-expense-id="${expense.id}">Remove</button></td>
        `;

        expensesListBody.appendChild(row);
        totalAmount += expense.amount;
    });

    // Update total
    expensesListTotal.textContent = formatCurrency(totalAmount);

    // Add event listeners for edit and remove buttons
    expensesListBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditExpenseModal(btn.dataset.expenseId));
    });
    expensesListBody.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeExpense(btn.dataset.expenseId));
    });
}


// Store the chart instance globally
let expenseChart = null;

function generateMemberExpensePieChart(forceRegenerate = false) {
    console.log('Generating Expense Distribution Chart...');
    console.log('Members:', members);
    console.log('Expenses:', expenses);

    // Use the correct container ID from your HTML
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
        console.error("Chart container 'expense-distribution-chart' not found.");
        return;
    }

    // Dispose of existing chart if it exists to ensure clean regeneration
    if (expenseChart) {
        expenseChart.dispose();
        expenseChart = null;
    }

    // Initialize a new ECharts instance
    expenseChart = echarts.init(chartContainer);

    // Ensure members and expenses are populated
    if (!members.length || !expenses.length) {
        chartContainer.innerHTML = '<p>No data available to generate chart.</p>';
        return;
    }

    // Calculate total cash outflow per member
    const memberExpense = {};
    members.forEach(member => {
        memberExpense[member] = 0;
    });

    expenses.forEach(expense => {
        if (expense.shares && typeof expense.shares === 'object') {
            Object.keys(expense.shares).forEach(member => {
                if (memberExpense.hasOwnProperty(member)) {
                    memberExpense[member] += expense.shares[member];
                }
            });
        } else if (expense.participants && expense.participants.length > 0) {
            const equalShare = expense.amount / expense.participants.length;
            expense.participants.forEach(member => {
                if (memberExpense.hasOwnProperty(member)) {
                    memberExpense[member] += equalShare;
                }
            });
        }
    });

    // Prepare data for ECharts
    const chartData = Object.keys(memberExpense)
        .filter(member => memberExpense[member] > 0)
        .map(member => ({
            name: member,
            value: memberExpense[member]
        }));

    console.log('Chart Data:', chartData);

    // Set ECharts options with total in center and hidden legends
    const option = {
        tooltip: {
            show: false,
            trigger: 'item',
            formatter: '{a} <br/>{b}: ${c} ({d}%)'
        },
        legend: {
            show: false,
            top: '5%',
            left: 'center'
        },
        series: [
            {
                name: 'Member Expense',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 5
                },
                label: {
				  show: true,
				  fontSize: 13,
				  formatter: function(params) {
					const formattedValue = new Intl.NumberFormat('en-US', {
					  minimumFractionDigits: 0,
					  maximumFractionDigits: 0
					}).format(Math.round(params.value));
					return `${params.name}\n$${formattedValue} (${params.percent.toFixed(1)}%)`;
				  }
				},
				emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: 'bold',
						formatter: function(params) {
							const formattedValue = new Intl.NumberFormat('en-US', {
							  minimumFractionDigits: 0,
							  maximumFractionDigits: 0
							}).format(Math.round(params.value));
						return `${params.name}\n$${formattedValue} (${params.percent.toFixed(1)}%)`;
					  }
					},
                },
                labelLine: {
                    show: true
                },
                data: chartData
            },
            {
                name: 'Total',
                type: 'pie',
                radius: ['0', '30%'],
                silent: true,
                itemStyle: {
                    color: 'rgba(250, 250, 250, 0.3)',
                    borderWidth: 0
                },
                label: {
				  show: true,
				  position: 'center',
				  formatter: function() {
					const total = chartData.reduce((sum, item) => sum + item.value, 0);
					// Format the total as whole number currency
					const formattedValue = new Intl.NumberFormat('en-US', {
					  minimumFractionDigits: 0,
					  maximumFractionDigits: 0
					}).format(Math.round(total));
					return `Total\n$${formattedValue}`;
				  },
				  fontSize: 18,
				  fontWeight: 'bold'
				},
				data: [{ value: 1, name: 'Total' }]
            }
        ]
    };

    // Render the chart with animation
    expenseChart.setOption(option);

    // Make the chart responsive
    window.addEventListener('resize', () => {
        if (expenseChart) {
            expenseChart.resize();
        }
    });
}


function generateCategoriesPieChart(forceRegenerate = false) {
  const chartContainer = document.getElementById('categories-chart-container');
  if (!chartContainer) {
    console.error("Categories chart container not found.");
    return;
  }

  // Dispose of existing chart if it exists
  if (categoriesChart) {
    categoriesChart.dispose();
    categoriesChart = null;
  }

  // Initialize a new ECharts instance using the global variable
  categoriesChart = echarts.init(chartContainer);

  // Calculate total expenditure per category
  const categoryExpense = {};
  expenses.forEach(expense => {
    const category = expense.category || 'Uncategorized';
    categoryExpense[category] = (categoryExpense[category] || 0) + expense.amount;
  });

  // Prepare data for ECharts
  const chartData = Object.keys(categoryExpense).map(category => ({
    name: category,
    value: categoryExpense[category]
  }));

  // Set ECharts options
  const option = {
    tooltip: {
	  show: false,
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
		show: false,
        top: '5%',
        left: 'center'
    },
    series: [
      {
        name: 'Category Expense',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
		itemStyle: {
			borderRadius: 10,
			borderColor: '#fff',
			borderWidth: 5
		},
        label: {
				  show: true,
				  fontSize: 13,
				  formatter: function(params) {
					const formattedValue = new Intl.NumberFormat('en-US', {
					  minimumFractionDigits: 0,
					  maximumFractionDigits: 0
					}).format(Math.round(params.value));
					return `${params.name}\n$${formattedValue} (${params.percent.toFixed(1)}%)`;
				  }
				},
				emphasis: {
                    label: {
                        show: true,
                        fontSize: 16,
                        fontWeight: 'bold',
						formatter: function(params) {
							const formattedValue = new Intl.NumberFormat('en-US', {
							  minimumFractionDigits: 0,
							  maximumFractionDigits: 0
							}).format(Math.round(params.value));
						return `${params.name}\n$${formattedValue} (${params.percent.toFixed(1)}%)`;
					  }
					},
                },
                labelLine: {
                    show: true
                },
        data: chartData
      },
      {
			name: 'Total',
			type: 'pie',
			radius: ['0', '30%'],
			silent: true,
			itemStyle: {
				color: 'rgba(250, 250, 250, 0.3)',
				borderWidth: 0
			},
			label: {
				  show: true,
				  position: 'center',
				  formatter: function() {
					const total = chartData.reduce((sum, item) => sum + item.value, 0);
					// Format the total as whole number currency
					const formattedValue = new Intl.NumberFormat('en-US', {
					  minimumFractionDigits: 0,
					  maximumFractionDigits: 0
					}).format(Math.round(total));
					return `Total\n$${formattedValue}`;
				  },
				  fontSize: 18,
				  fontWeight: 'bold'
				},
				data: [{ value: 1, name: 'Total' }]
            }
        ]
    };

  // Render the chart with animation
  categoriesChart.setOption(option);
  
  // Make the chart responsive
  window.addEventListener('resize', () => {
    if (categoriesChart) {
      categoriesChart.resize();
    }
  });
}




// Add function to fetch categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        if (response.ok) {
            categories = await response.json();
            populateCategoryDropdowns();
        }
    } catch (error) {
        console.error("Error loading categories:", error);
        categories = []; // Initialize with empty array if loading fails
    }
}

// Function to populate category dropdowns
function populateCategoryDropdowns() {
    const expenseCategoryDropdown = document.getElementById('expense-category');
    const editExpenseCategoryDropdown = document.getElementById('edit-expense-category');

    // Clear existing options
    expenseCategoryDropdown.innerHTML = '<option value="" disabled selected>Select category</option>';
    editExpenseCategoryDropdown.innerHTML = '<option value="" disabled selected>Select category</option>';

    // Add categories as options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;

        const editOption = document.createElement('option');
        editOption.value = category.name;
        editOption.textContent = category.name;

        expenseCategoryDropdown.appendChild(option);
        editExpenseCategoryDropdown.appendChild(editOption);
    });
}

// Replace saveToLocalStorage with a no-op function
function saveToLocalStorage() {
    console.log("Data is now saved on the server");
}


  
// Document ready event listener
document.addEventListener('DOMContentLoaded', async () => {
    // Set default date
    if (expenseDate) {
        expenseDate.value = new Date().toISOString().split('T')[0];
    }

    // Add event listeners
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', addMember);
    }

    if (expenseForm) {
        expenseForm.addEventListener('submit', addExpense);
    }

    // Split type event listener
    if (splitType) {
        splitType.addEventListener('change', function() {
            if (this.value === 'unequal') {
                showUnequalSplitInputs();
            } else {
                unequalSplitContainer.classList.add('hidden');
            }
        });
    }

    // Add event listeners for edit functionality
    if (editExpenseForm) {
        editExpenseForm.addEventListener('submit', submitEditExpense);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editTransactionSection.classList.add('hidden');
			// Show expenses list section
			showTripSection('expenses-list');
        });
    }

    if (editSplitType) {
        editSplitType.addEventListener('change', function() {
            if (this.value === 'unequal') {
                // Get checked participants
                const participants = [];
                editExpenseParticipants.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                    participants.push(checkbox.value);
                });

                // Create unequal split inputs
                editUnequalSplitContainer.innerHTML = '';
                editUnequalSplitContainer.classList.remove('hidden');

                const amount = parseFloat(editExpenseAmount.value);
                const equalShare = amount / participants.length;

                participants.forEach(participant => {
                    const div = document.createElement('div');
                    div.className = 'form-group';
                    div.innerHTML = `
                        <label for="edit-share-${participant}">${participant}'s Share:</label>
                        <input type="number" id="edit-share-${participant}" value="${equalShare.toFixed(2)}" step="0.01" min="0">
                    `;
                    editUnequalSplitContainer.appendChild(div);
                });
            } else {
                editUnequalSplitContainer.classList.add('hidden');
            }
        });
    }

    // Add event listeners for user selectors
	if (userSelector) {
		userSelector.addEventListener('change', function() {
			updateUserExpenseHistory(); // Don't pass any parameters
		});
	}

	if (cashoutflowSelector) {
		cashoutflowSelector.addEventListener('change', function() {
			updateCashOutflowHistory(); // Don't pass any parameters
		});
	}


    try {
        // Try to load trip from URL first
        const tripLoaded = await initializeTripFromUrl();
        
        // If no trip was loaded from URL, load general data
        if (!tripLoaded) {
            await loadData();
        }
    } catch (error) {
        console.error("Initialization error:", error);
        // Fallback to load basic data
        await loadData();
    }
});


// Function to load trips
async function loadTrips() {
  try {
    const response = await fetch(`${API_URL}/trips`);
    if (response.ok) {
      trips = await response.json();
      updateTripsUI();
    }
  } catch (error) {
    console.error("Error loading trips:", error);
  }
}

// Function to create a new trip
async function createTrip(e) {
  e.preventDefault();
  
  const name = document.getElementById('trip-name').value.trim();
  const description = document.getElementById('trip-description').value.trim();
  const startDate = document.getElementById('trip-start-date').value;
  const endDate = document.getElementById('trip-end-date').value;
  
  if (!name) {
    alert('Please enter a trip name');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        start_date: startDate,
        end_date: endDate
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const newTrip = {
        id: result.id,
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        url_id: result.url_id
      };
      
      trips.push(newTrip);
      document.getElementById('trip-form').reset();
      updateTripsUI();
    } else {
      alert('Failed to create trip');
    }
  } catch (error) {
    console.error("Error creating trip:", error);
    alert('Failed to connect to server');
  }
}

// Function to select a trip
function selectTrip(tripId) {
  currentTripId = tripId;
  // Update UI to show current trip
  document.querySelectorAll('.list-item').forEach(item => {
    item.classList.remove('active-trip');
  });
  
  document.querySelector(`.select-trip-btn[data-id="${tripId}"]`).closest('.list-item').classList.add('active-trip');
  
  // Load expenses for this trip
  loadTripExpenses(tripId);
}

// Function to load expenses for a specific trip
async function loadTripExpenses(tripId) {
    try {
        const response = await fetch(`${API_URL}/trips/${tripId}/expenses`);
        if (!response.ok) {
            console.error("Failed to load trip expenses");
            expenses = [];
            return;
        }
        
        // Replace all expenses with just trip-specific ones
        expenses = await response.json();
        
        // Update all relevant UI components
        updateExpensesList();
        updateExpensesTable();
        calculateBalances();
        await calculateCashOutflows();
		updateUserExpenseHistory();
        
        // Only update user expense history if a user is selected
        if (userSelector && userSelector.value) {
            updateUserExpenseHistory();
        }
        
        // Only update cash outflow history if a user is selected
        if (cashoutflowSelector && cashoutflowSelector.value) {
            updateCashOutflowHistory();
        }
    } catch (error) {
        console.error("Error loading trip expenses:", error);
        expenses = [];
    }
}


function updateDetailedExpensesUI() {
  const detailedExpensesList = document.getElementById('detailed-expenses-list');
  detailedExpensesList.innerHTML = '';

  if (expenses.length === 0) {
    detailedExpensesList.innerHTML = '<p>No expenses added yet</p>';
    return;
  }

  expenses.forEach((expense) => {
    const expenseItem = document.createElement('div');
    expenseItem.className = 'expense-row';

    const formattedDate = expense.date.split('T')[0]; // Format date as YYYY-MM-DD

    let participantsHTML = '';
    expense.participants.forEach(participant => {
      participantsHTML += `<div>${participant}: ${formatCurrency(expense.shares[participant])}</div>`;
    });

    expenseItem.innerHTML = `
      <div class="expense-left-section">
        <h4>${expense.description}</h4>
        <p>Amount: ${formatCurrency(expense.amount)}</p>
        <p>Category: ${expense.category || 'Uncategorized'}</p>
        <p>Paid by: ${expense.payer}</p>
        <p>Date: ${formattedDate}</p>
      </div>
      <div class="expense-middle-section">
        <h4>Participants:</h4>
        ${participantsHTML}
      </div>
      <div class="expense-right-section">
        <button class="edit-btn" data-expense-id="${expense.id}">Edit</button>
        <button class="remove-btn" data-expense-id="${expense.id}">Remove</button>
      </div>
    `;

    detailedExpensesList.appendChild(expenseItem);
  });

  // Add event listeners for edit and remove buttons
  detailedExpensesList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const expenseId = btn.dataset.expenseId;
      if (expenseId) {
        openEditExpenseModal(expenseId);
      } else {
        console.error('No expense ID found for edit button');
      }
    });
  });

  detailedExpensesList.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeExpense(btn.dataset.expenseId));
  });
}





// Helper function to format date range
function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'No dates set';
  if (startDate && !endDate) return `From ${new Date(startDate).toLocaleDateString()}`;
  if (!startDate && endDate) return `Until ${new Date(endDate).toLocaleDateString()}`;
  return `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
}

// Function to handle URL routing
function handleRouting() {
  const path = window.location.pathname;
  
  // Check if path matches a trip URL pattern
  const tripMatch = path.match(/\/trip\/([a-zA-Z0-9-]+)/);
  
  if (tripMatch) {
    // Extract URL ID from path
    const urlId = tripMatch[1];
    loadTripByUrlId(urlId);
  } else {
    // Default view - show all trips
    loadTrips();
    loadData();
  }
}

// Function to load trip by URL ID
async function loadTripByUrlId(urlId) {
  try {
    const response = await fetch(`${API_URL}/trips/${urlId}`);
    if (response.ok) {
      const trip = await response.json();
      
      // Hide other sections and show only trip-related content
      document.getElementById('group-section').style.display = 'none';
      document.getElementById('expense-section').querySelector('h2').textContent = `Expenses for ${trip.name}`;
      
      // Set current trip
      currentTripId = trip.id;
      
      // Load trip expenses
      loadTripExpenses(trip.id);
    } else {
      // Trip not found
      alert('Trip not found');
      window.location.href = '/';
    }
  } catch (error) {
    console.error("Error loading trip by URL:", error);
  }
}

function toggleTripManagementSection(show) {
  const tripManagement = document.getElementById('trip-management-section');
  if (tripManagement) {
    tripManagement.style.display = show ? 'block' : 'none';
  }
}


const editExpenseModal = document.getElementById("editExpenseModal");
const closeEditExpenseModal = document.getElementById("closeEditExpenseModal");
const editExpenseForm = document.getElementById("edit-expense-form");

function openEditExpenseModal(expenseId) {
  const expense = expenses.find(exp => exp.id === Number(expenseId));
  if (!expense) {
    console.error('Expense not found for ID:', expenseId);
    return;
  }

  // Populate modal fields
  document.getElementById("edit-expense-id").value = expense.id;
  document.getElementById("edit-expense-description").value = expense.description;
  document.getElementById("edit-expense-amount").value = expense.amount;
  document.getElementById("edit-expense-payer").value = expense.payer;
  document.getElementById("edit-expense-date").value = new Date(expense.date).toISOString().split('T')[0];
  document.getElementById("edit-expense-category").value = expense.category || '';

  // Populate participants
  const participantsContainer = document.getElementById("edit-expense-participants");
  participantsContainer.innerHTML = "";
  members.forEach(member => {
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    div.innerHTML = `
      <input type="checkbox" id="edit-participant-${member}" value="${member}" 
        ${expense.participants.includes(member) ? 'checked' : ''}>
      <label for="edit-participant-${member}">${member}</label>
    `;
    participantsContainer.appendChild(div);
  });

  // Handle split type
  const splitTypeSelect = document.getElementById('edit-split-type');
  const equalShare = expense.amount / expense.participants.length;
  const isEqualSplit = expense.participants.every(p => 
    Math.abs(expense.shares[p] - equalShare) < 0.01
  );
  
  splitTypeSelect.value = isEqualSplit ? 'equal' : 'unequal';
  handleEditSplitTypeChange();

  // Show the modal
  document.getElementById("editExpenseModal").classList.remove("hidden");
}



// Close modal
closeEditExpenseModal.addEventListener("click", () => {
    editExpenseModal.classList.add("hidden");
});

//Add an event listener for split type changes
document.getElementById('edit-split-type').addEventListener('change', function() {
  if (this.value === 'unequal') {
    showEditUnequalSplitInputs(expenses.find(e => e.id === Number(editExpenseId.value)));
  } else {
    document.getElementById('edit-unequal-split-container').classList.add('hidden');
  }
});




//Add Event Listener for Split Type Changes
document.getElementById('edit-split-type').addEventListener('change', handleEditSplitTypeChange);

function handleEditSplitTypeChange() {
  const splitType = document.getElementById('edit-split-type').value;
  const unequalSplitContainer = document.getElementById('edit-unequal-split-container');
  
  if (splitType === 'unequal') {
    showEditUnequalSplitInputs();
  } else {
    unequalSplitContainer.classList.add('hidden');
    unequalSplitContainer.innerHTML = '';
  }
}

function showEditUnequalSplitInputs() {
  const unequalSplitContainer = document.getElementById('edit-unequal-split-container');
  unequalSplitContainer.innerHTML = '';
  unequalSplitContainer.classList.remove('hidden');
  
  const amount = parseFloat(document.getElementById('edit-expense-amount').value) || 0;
  const checkedParticipants = Array.from(
    document.getElementById('edit-expense-participants').querySelectorAll('input[type="checkbox"]:checked')
  ).map(checkbox => checkbox.value);
  
  if (checkedParticipants.length === 0) {
    alert('Please select at least one participant');
    document.getElementById('edit-split-type').value = 'equal';
    return;
  }
  
  const equalShare = amount / checkedParticipants.length;
  
  checkedParticipants.forEach(participant => {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
      <label for="edit-share-${participant}">${participant}'s share:</label>
      <input type="number" id="edit-share-${participant}" name="share-${participant}" 
        value="${equalShare.toFixed(2)}" step="0.01">
    `;
    unequalSplitContainer.appendChild(div);
  });
}



