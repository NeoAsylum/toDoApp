const authContainer = document.getElementById('auth-container');
const registerContainer = document.getElementById('register-container');
const todoContainer = document.getElementById('todo-container');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');

const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const addTodoBtn = document.getElementById('add-todo-btn');

const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const todoInput = document.getElementById('todo-input');
const todoDueDateInput = document.getElementById('todo-due-date');
const todoPriorityInput = document.getElementById('todo-priority');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const searchResultsInfo = document.getElementById('search-results-info');

// Use relative paths for Nginx proxy
const AUTH_API_URL = '/api/auth';
const TODO_API_URL = '/api/todos';

// Store all todos for filtering
let allTodos = [];

function showSection(sectionId) {
    [authContainer, registerContainer, todoContainer].forEach(el => el.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    
    if (sectionId === 'todo-container') {
        logoutBtn.classList.remove('hidden');
    } else {
        logoutBtn.classList.add('hidden');
    }
}

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('register-container');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showSection('auth-container');
});

// Prevent form submissions from reloading page
document.getElementById('login-form').addEventListener('submit', (e) => e.preventDefault());
document.getElementById('register-form').addEventListener('submit', (e) => e.preventDefault());

loginBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Ensure form doesn't submit
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    try {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            showSection('todo-container');
            loadTodos();
        } else {
            const errorData = await response.json();
            alert(`Login failed: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Network error. Please try again.');
    }
});

registerBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = registerUsernameInput.value;
    const password = registerPasswordInput.value;

    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }

    try {
        const response = await fetch(`${AUTH_API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            alert('Registration successful! Please login.');
            showSection('auth-container');
        } else {
            const errorData = await response.json();
            alert(`Registration failed: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Network error. Please try again.');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    showSection('auth-container');
    todoList.querySelector('tbody').innerHTML = '';
});

addTodoBtn.addEventListener('click', async () => {
    const task = todoInput.value;
    const due_date = todoDueDateInput.value;
    const priority = todoPriorityInput.value;
    
    if (!task) {
        alert('Please enter a task');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(TODO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ task, due_date, priority })
        });

        if (response.ok) {
            todoInput.value = '';
            todoDueDateInput.value = '';
            todoPriorityInput.value = 'Medium';
            loadTodos();
        } else {
            alert('Failed to add todo');
        }
    } catch (error) {
        console.error('Add todo error:', error);
    }
});

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

// Filter todos based on search input
function filterTodos() {
    const searchTerm = searchInput.value.toLowerCase();
    const tbody = todoList.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const taskText = row.querySelector('.task-text')?.textContent?.toLowerCase() || '';
        const isVisible = taskText.includes(searchTerm);
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
    });

    // Show/hide search results info
    if (searchTerm) {
        searchResultsInfo.textContent = `Found ${visibleCount} task(s)`;
        searchResultsInfo.classList.remove('hidden');
    } else {
        searchResultsInfo.classList.add('hidden');
    }
}

async function loadTodos() {
    const token = localStorage.getItem('token');
    if (!token) {
        showSection('auth-container');
        return;
    }

    try {
        const response = await fetch(TODO_API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const todos = await response.json();
            const tbody = todoList.querySelector('tbody');
            tbody.innerHTML = '';
            
            if (todos.length === 0) {
                emptyState.classList.remove('hidden');
                todoList.classList.add('hidden');
            } else {
                emptyState.classList.add('hidden');
                todoList.classList.remove('hidden');
                
                todos.forEach(todo => {
                    const tr = document.createElement('tr');
                    tr.dataset.id = todo.id;
                    if (todo.completed) tr.classList.add('completed');
                    
                    tr.innerHTML = `
                        <td><span class="task-text">${todo.task}</span></td>
                        <td><span class="due-date-text">${todo.due_date ? new Date(todo.due_date).toLocaleDateString() : '-'}</span></td>
                        <td><span class="priority-badge priority-${todo.priority}">${todo.priority}</span></td>
                        <td>
                            <div class="checkbox-wrapper">
                                <input type="checkbox" class="todo-completed-checkbox" ${todo.completed ? 'checked' : ''}>
                            </div>
                        </td>
                        <td class="actions-cell">
                            <button class="btn btn-secondary edit-btn">Edit</button>
                            <button class="btn btn-danger delete-btn">Delete</button>
                        </td>
                    `;

                    // Event Listeners
                    const editBtn = tr.querySelector('.edit-btn');
                    const deleteBtn = tr.querySelector('.delete-btn');
                    const checkbox = tr.querySelector('.todo-completed-checkbox');

                    editBtn.addEventListener('click', () => handleEdit(tr, todo, token));
                    deleteBtn.addEventListener('click', () => handleDelete(todo.id, token));
                    checkbox.addEventListener('change', (e) => handleToggle(todo.id, e.target.checked, token));

                    tbody.appendChild(tr);
                });
            }
        } else {
            localStorage.removeItem('token');
            showSection('auth-container');
        }
    } catch (error) {
        console.error('Load todos error:', error);
    }
}

async function handleEdit(tr, todo, token) {
    const isEditing = tr.classList.contains('editing');
    const taskText = tr.querySelector('.task-text');
    const dueDateText = tr.querySelector('.due-date-text');
    const priorityBadge = tr.querySelector('.priority-badge'); // We replace the badge parent or content
    const editBtn = tr.querySelector('.edit-btn');

    if (isEditing) {
        // Save
        const updatedTask = tr.querySelector('.edit-task-input').value;
        const updatedDueDate = tr.querySelector('.edit-due-date-input').value;
        const updatedPriority = tr.querySelector('.edit-priority-select').value;

        try {
            const response = await fetch(`${TODO_API_URL}/${todo.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    task: updatedTask,
                    due_date: updatedDueDate,
                    priority: updatedPriority
                })
            });

            if (response.ok) {
                loadTodos();
            } else {
                alert('Failed to update todo');
            }
        } catch (error) {
            console.error('Update error:', error);
        }
    } else {
        // Enter Edit Mode
        tr.classList.add('editing');
        editBtn.textContent = 'Save';
        editBtn.classList.remove('btn-secondary');
        editBtn.classList.add('btn-primary');

        taskText.innerHTML = `<input type="text" class="edit-task-input" value="${todo.task}">`;
        dueDateText.innerHTML = `<input type="date" class="edit-due-date-input" value="${formatDateForInput(todo.due_date)}">`;
        
        // Replace the priority badge with a select
        const currentPriorityHtml = priorityBadge.outerHTML;
        // We need to find the parent cell to replace content correctly or just replace the badge
        // The badge is inside a span. Let's replace the span's parent innerHTML for simplicity in this specific structure
        const priorityCell = priorityBadge.parentElement;
        priorityCell.innerHTML = `
            <select class="edit-priority-select">
                <option value="Low" ${todo.priority === 'Low' ? 'selected' : ''}>Low</option>
                <option value="Medium" ${todo.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="High" ${todo.priority === 'High' ? 'selected' : ''}>High</option>
            </select>
        `;
    }
}

async function handleDelete(id, token) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`${TODO_API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadTodos();
        } else {
            alert('Failed to delete todo');
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}

async function handleToggle(id, completed, token) {
    try {
        const response = await fetch(`${TODO_API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed })
        });

        if (response.ok) {
            loadTodos();
        } else {
            alert('Failed to update status');
        }
    } catch (error) {
        console.error('Toggle error:', error);
    }
}

// Initial load
if (localStorage.getItem('token')) {
    showSection('todo-container');
    loadTodos();
} else {
    showSection('auth-container');
}

// Add search/filter listener
searchInput.addEventListener('input', filterTodos);