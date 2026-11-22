# NoteNest – Personal Notes Application

NoteNest is a simple web application that allows users to create, manage, edit and delete their personal notes. It includes user authentication and individual note management.

## Features

- User registration and login
- Secure password hashing
- Create, edit and delete notes
- Search notes
- User-specific notes
- Session-based authentication
- CSRF protection
- SQLite database
- Responsive interface

## Technologies Used

- Python
- Flask
- SQLite
- HTML
- CSS
- JavaScript

## Project Structure

```text
note-web/
├── app.py
├── requirements.txt
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── .gitignore
```

## Installation

1. Clone the repository.

```bash
git clone https://github.com/yadavabhay67923-lang/Note-Nest.git
```

2. Open the project folder.

```bash
cd Note-Nest
```

3. Create a virtual environment.

```bash
python -m venv venv
```

4. Activate it on Windows.

```bash
venv\Scripts\activate
```

5. Install dependencies.

```bash
pip install -r requirements.txt
```

6. Run the application.

```bash
python app.py
```

7. Open in your browser.

```text
http://127.0.0.1:5000/
```

## Security

- Password hashing
- Authentication protection
- User-specific note access
- CSRF token validation
- Session cookie protection

## Purpose

This project was developed as a web development assignment to practice backend development, database integration, authentication, frontend interaction and basic web security.

## Author

Developed as a learning and development project.
