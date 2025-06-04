# Analogous 🧠

A platform that helps users understand complex topics through analogies using AI. Users can create prompts like "Explain [X] like I'm a [Y]" through an intuitive drag-and-drop interface.

## 🚀 Features

- Interactive drag-and-drop interface for creating analogy prompts
- Beautiful holographic card design
- User authentication and session management
- History of past analogies
- Dark mode by default
- Responsive design for all devices

## 🛠 Tech Stack

- **Frontend**: Next.js + React + Tailwind CSS
- **Backend**: Python with Quart
- **Database/Auth**: Supabase
- **State Management**: Zustand
- **Styling**: Tailwind CSS + Custom holographic effects

## 🏗️ Project Structure

```
/frontend          # Next.js frontend application
/backend           # Quart backend server
start.sh          # Development startup script
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/analogous.git
   cd analogous
   ```

2. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

3. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Create `.env.local` in `/frontend` with your Supabase credentials
   - Create `.env` in `/backend` for backend configuration

5. Start the development servers:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🔧 Development

- Frontend development server: `npm run dev` (in `/frontend`)
- Backend development server: `python app.py` (in `/backend`)
- Use `start.sh` to run both servers concurrently

## 📝 License

MIT License - see LICENSE file for details