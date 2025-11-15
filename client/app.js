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

const currentPath = window.location.pathname;
const clientBasePath = currentPath.startsWith('/client1/') ? '/client1' : '/client2';

const AUTH_API_URL = `${clientBasePath}/api/auth`;
const TODO_API_URL = `${clientBasePath}/api/todos`;

showRegister.addEventListener('click', () => {
    authContainer.style.display = 'none';
    registerContainer.style.display = 'block';
});

showLogin.addEventListener('click', () => {
    registerContainer.style.display = 'none';
    authContainer.style.display = 'block';
});

loginBtn.addEventListener('click', async () => {
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;

    const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).catch(error => {
        console.error('Login fetch error:', error);
        alert('Network error during login. Please check your connection.');
        return null; // Return null to prevent further processing
    });

    if (!response) return; // If fetch failed, stop here

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        authContainer.style.display = 'none';
        registerContainer.style.display = 'none';
        todoContainer.style.display = 'block';
        loadTodos();
    } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        alert(`Login failed: ${errorData.message || response.statusText}`);
    }
});

registerBtn.addEventListener('click', async () => {
    const username = registerUsernameInput.value;
    const password = registerPasswordInput.value;

    const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        alert('Registration successful! Please login.');
        registerContainer.style.display = 'none';
        authContainer.style.display = 'block';
    } else {
        alert('Registration failed');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    todoContainer.style.display = 'none';
    authContainer.style.display = 'block';
    todoList.innerHTML = '';
});

addTodoBtn.addEventListener('click', async () => {
    const task = todoInput.value;
    const due_date = todoDueDateInput.value;
    const priority = todoPriorityInput.value;
    if (!task) return;

    const token = localStorage.getItem('token');
    const response = await fetch(`${TODO_API_URL}/todos`, {
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
});

// Helper function to format date for input type="date" (YYYY-MM-DD)
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        // Attempt to parse DD.MM.YYYY format
        const parts = dateString.split('.');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
            }
        }
        return ''; // Return empty if date is invalid or unparseable
    }
    return date.toISOString().split('T')[0];
}

async function loadTodos() {
    const token = localStorage.getItem('token');
    if (!token) {
        todoContainer.style.display = 'none';
        authContainer.style.display = 'block';
        return;
    }

    const response = await fetch(`${TODO_API_URL}/todos`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        const todos = await response.json();
        todoList.querySelector('tbody').innerHTML = ''; // Clear existing table rows
        todos.forEach(todo => {
            const tr = document.createElement('tr');
            tr.dataset.id = todo.id;
            tr.innerHTML = `
                <td><span class="task-text">${todo.task}</span></td>
                <td><span class="due-date-text">${todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No Due Date'}</span></td>
                <td><span class="priority-text">Priority: ${todo.priority}</span></td>
                <td><span class="status-text">Status: ${todo.status}</span></td>
                <td>
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </td>
            `;

            if (todo.completed) {
                tr.classList.add('completed');
            }

            const taskText = tr.querySelector('.task-text');
            const dueDateText = tr.querySelector('.due-date-text');
            const priorityText = tr.querySelector('.priority-text');
            const statusText = tr.querySelector('.status-text');
            const editBtn = tr.querySelector('.edit-btn');
            const deleteBtn = tr.querySelector('.delete-btn');

            tr.addEventListener('click', async (e) => {
                if (e.target === editBtn || e.target === deleteBtn) {
                    return;
                }
                const updateResponse = await fetch(`${TODO_API_URL}/todos/${todo.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ completed: !todo.completed })
                });
                if (updateResponse.ok) {
                    loadTodos();
                } else {
                    alert('Failed to update todo');
                }
            });

            editBtn.addEventListener('click', () => {
                const isEditing = tr.classList.contains('editing');
                if (isEditing) {
                    // Save changes
                    const updatedTask = tr.querySelector('.edit-task-input').value;
                    const updatedDueDate = tr.querySelector('.edit-due-date-input').value;
                    const updatedPriority = tr.querySelector('.edit-priority-select').value;
                    const updatedStatus = tr.querySelector('.edit-status-select').value;

                    fetch(`${TODO_API_URL}/todos/${todo.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            task: updatedTask,
                            due_date: updatedDueDate,
                            priority: updatedPriority,
                            status: updatedStatus
                        })
                    }).then(response => {
                        if (response.ok) {
                            loadTodos();
                        } else {
                            alert('Failed to update todo');
                        }
                    });
                } else {
                    // Enter edit mode
                    tr.classList.add('editing');
                    taskText.innerHTML = `<input type="text" class="edit-task-input" value="${todo.task}">`;
                    dueDateText.innerHTML = `<input type="date" class="edit-due-date-input" value="${formatDateForInput(todo.due_date)}">`;
                    priorityText.innerHTML = `
                        <select class="edit-priority-select">
                            <option value="Low" ${todo.priority === 'Low' ? 'selected' : ''}>Low</option>
                            <option value="Medium" ${todo.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="High" ${todo.priority === 'High' ? 'selected' : ''}>High</option>
                        </select>`;
                    statusText.innerHTML = `
                        <select class="edit-status-select">
                            <option value="Not Started" ${todo.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
                            <option value="In Progress" ${todo.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${todo.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>`;

                    editBtn.textContent = 'Save';
                }
            });

            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const deleteResponse = await fetch(`${TODO_API_URL}/todos/${todo.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (deleteResponse.ok) {
                    loadTodos();
                } else {
                    alert('Failed to delete todo');
                }
            });
            todoList.querySelector('tbody').appendChild(tr);
        });
        authContainer.style.display = 'none';
        registerContainer.style.display = 'none';
        todoContainer.style.display = 'block';
    } else {
        localStorage.removeItem('token');
        todoContainer.style.display = 'none';
        authContainer.style.display = 'block';
    }
}

// Initial load
loadTodos();