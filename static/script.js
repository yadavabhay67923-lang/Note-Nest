// Show notification message
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");

    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
// NoteNest - Frontend JavaScript

const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

const authForm = document.getElementById("authForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authButton = document.getElementById("authButton");
const authMessage = document.getElementById("authMessage");

const noteFormSection = document.getElementById("noteFormSection");
const noteForm = document.getElementById("noteForm");
const notesContainer = document.getElementById("notesContainer");

const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");

const searchInput = document.getElementById("searchInput");

let currentMode = "login";
let currentUser = "";
let notes = [];
let editingId = null;


// API Helper Function
async function apiRequest(url, method = "GET", data = null) {
    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin"
    };

    const methodsThatChangeData = ["POST", "PUT", "DELETE"];

    if (methodsThatChangeData.includes(method)) {
        const csrfResponse = await fetch("/api/csrf", {
            credentials: "same-origin"
        });

        const csrfData = await csrfResponse.json();

        if (!csrfResponse.ok) {
            throw new Error("Unable to get security token");
        }

        options.headers["X-CSRF-Token"] = csrfData.csrf_token;
    }

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
    }

    return result;
}


// Switch to Login
function showLogin() {
    currentMode = "login";

    loginTab.classList.add("active");
    signupTab.classList.remove("active");

    nameInput.classList.add("hidden");
    nameInput.required = false;

    authButton.textContent = "Login";
    authMessage.textContent = "";
}


// Switch to Signup
function showSignup() {
    currentMode = "signup";

    signupTab.classList.add("active");
    loginTab.classList.remove("active");

    nameInput.classList.remove("hidden");
    nameInput.required = true;

    authButton.textContent = "Create Account";
    authMessage.textContent = "";
}


loginTab.addEventListener("click", showLogin);
signupTab.addEventListener("click", showSignup);


// Signup and Login
authForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const data = {
        email: email,
        password: password
    };

    if (currentMode === "signup") {
        data.name = nameInput.value.trim();
    }

    authButton.disabled = true;
    authButton.textContent = "Please wait...";
    authMessage.textContent = "";

    try {
        const url = currentMode === "signup"
            ? "/api/signup"
            : "/api/login";

        const result = await apiRequest(url, "POST", data);

        authMessage.style.color = "green";
        authMessage.textContent = result.message;

        await openDashboard(result.name);

    } catch (error) {
        authMessage.style.color = "red";
        authMessage.textContent = error.message;

    } finally {
        authButton.disabled = false;
        authButton.textContent =
            currentMode === "signup" ? "Create Account" : "Login";
    }
});


// Open Dashboard
async function openDashboard(name) {
    currentUser = name;

    authSection.classList.add("hidden");
    dashboard.classList.remove("hidden");

    document.getElementById("welcomeName").textContent =
        "Welcome, " + name;

    await loadNotes();
}


// Check Existing Login Session
async function checkSession() {
    try {
        const result = await apiRequest("/api/me");

        await openDashboard(result.name);

    } catch (error) {
        authSection.classList.remove("hidden");
        dashboard.classList.add("hidden");
    }
}


// Logout
document.getElementById("logoutBtn").addEventListener("click", async function() {
    try {
        await apiRequest("/api/logout", "POST");

        currentUser = "";
        notes = [];

        dashboard.classList.add("hidden");
        authSection.classList.remove("hidden");

        authForm.reset();
        noteForm.reset();
        searchInput.value = "";

        noteFormSection.classList.add("hidden");

        showLogin();

    } catch (error) {
        alert(error.message);
    }
});


// Show New Note Form
document.getElementById("addNoteBtn").addEventListener("click", function() {
    editingId = null;

    noteForm.reset();

    document.getElementById("formHeading").textContent =
        "Create New Note";

    document.getElementById("saveBtn").textContent = "Save Note";

    noteFormSection.classList.remove("hidden");
    noteTitle.focus();
});


// Cancel Note Form
document.getElementById("cancelBtn").addEventListener("click", function() {
    noteFormSection.classList.add("hidden");

    noteForm.reset();
    editingId = null;
});


// Save or Update Note
noteForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (!title || !content) {
        alert("Please fill all fields");
        return;
    }

    const data = {
        title: title,
        content: content
    };

    const saveButton = document.getElementById("saveBtn");

    saveButton.disabled = true;

    try {
        if (editingId !== null) {
            await apiRequest(
                "/api/notes/" + editingId,
                "PUT",
                data
            );

        } else {
            await apiRequest(
                "/api/notes",
                "POST",
                data
            );
        }

        noteForm.reset();
        noteFormSection.classList.add("hidden");

        editingId = null;

        await loadNotes();

    } catch (error) {
        alert(error.message);

    } finally {
        saveButton.disabled = false;
    }
});


// Load Notes from Database
async function loadNotes() {
    try {
        notes = await apiRequest("/api/notes");

        displayNotes();

    } catch (error) {
        alert(error.message);
    }
}


// Display Notes
function displayNotes() {
    notesContainer.innerHTML = "";

    const searchText = searchInput.value.toLowerCase();

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchText) ||
        note.content.toLowerCase().includes(searchText)
    );

    document.getElementById("notesCount").textContent =
        filteredNotes.length + " Notes";

   if (notes.length === 0) {
    notesContainer.innerHTML = `
        <div class="empty-state">
            <h3>No notes yet!</h3>
            <p>Start by creating your first note.</p>
        </div>
    `;
    return;
}

    filteredNotes.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title;

        const content = document.createElement("p");
        content.textContent = note.content;

        const actions = document.createElement("div");
        actions.className = "note-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", function() {
            editNote(note.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function() {
            deleteNote(note.id);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(title);
        card.appendChild(content);
        card.appendChild(actions);

        notesContainer.appendChild(card);
    });
}


// Edit Note
function editNote(id) {
    const note = notes.find(item => item.id === id);

    if (!note) return;

    editingId = id;

    noteTitle.value = note.title;
    noteContent.value = note.content;

    document.getElementById("formHeading").textContent =
        "Edit Note";

    document.getElementById("saveBtn").textContent =
        "Update Note";

    noteFormSection.classList.remove("hidden");

    noteTitle.focus();
}


// Delete Note
async function deleteNote(id) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this note?"
    );

    if (!confirmDelete) return;

    try {
        await apiRequest(
            "/api/notes/" + id,
            "DELETE"
        );

        await loadNotes();

    } catch (error) {
        alert(error.message);
    }
}


// Search Notes
searchInput.addEventListener("input", displayNotes);


// Start Application
checkSession();