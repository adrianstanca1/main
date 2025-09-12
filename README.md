# AS Agents - Construction Management Platform

A comprehensive construction management application built with React, TypeScript, and Vite. This platform provides tools for project management, team collaboration, safety reporting, financial tracking, and more.

## 🚀 Features

### Core Functionality
- **Project Management**: Create, manage, and track construction projects
- **Task Management**: Kanban boards, task assignments, and progress tracking
- **Team Management**: User roles, permissions, and team collaboration
- **Time Tracking**: Clock in/out, timesheet management, and approval workflows
- **Document Management**: Upload, categorize, and manage project documents
- **Safety Management**: Incident reporting and safety compliance tracking
- **Financial Management**: Budget tracking, invoicing, and cost analysis

### Advanced Features
- **AI-Powered Tools**: AI advisor, site inspection assistance, and document search
- **Maps Integration**: Project location mapping with Leaflet
- **Offline Support**: Service worker for offline functionality
- **Real-time Chat**: Team communication and messaging
- **Mobile-Responsive**: Optimized for all device sizes
- **Dark/Light Theme**: User preference themes with smooth transitions

## 🛠️ Technology Stack

- **Frontend**: React 18.2, TypeScript, Vite
- **Styling**: Tailwind CSS (CDN)
- **Maps**: Leaflet, React-Leaflet
- **AI Integration**: Google Generative AI
- **State Management**: React Hooks
- **Build Tool**: Vite with optimized chunking
- **Code Quality**: ESLint, TypeScript compiler
- **PWA**: Service Worker for offline functionality

## 🏗️ Project Structure

```
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── layout/          # Layout components (Header, Sidebar)
│   └── *.tsx            # Feature-specific components
├── hooks/               # Custom React hooks
├── services/            # API services and mock data
├── types.ts             # TypeScript type definitions
├── utils/               # Utility functions and validation
└── public/              # Static assets and service worker
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd main
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables** (optional)
```bash
# Create .env file for Google AI integration
GEMINI_API_KEY=your_api_key_here
```

4. **Start development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run type-check` - Run TypeScript type checking

## 🔧 Configuration

### Bundle Optimization
The application uses Vite's manual chunking to optimize bundle size:
- **vendor**: React and React-DOM (141KB)
- **maps**: Leaflet and mapping libraries (165KB)
- **ai**: Google Generative AI (245KB)
- **utils**: Utility libraries (2.6KB)
- **main**: Application code (165KB)

### Performance Features
- Code splitting for better loading performance
- Service worker for offline functionality
- Optimized asset loading
- Tree shaking for minimal bundle size

## 🔒 Security Features

- Input sanitization and validation
- XSS protection through proper escaping
- Secure file upload validation
- Environment variable management
- Role-based access control

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode**: Complete dark theme with smooth transitions
- **Accessibility**: ARIA labels and keyboard navigation
- **Loading States**: Spinner components and skeleton loading
- **Error Boundaries**: Graceful error handling and recovery

## 🧪 Code Quality

- **TypeScript**: Full type safety and IntelliSense
- **ESLint**: Code linting with modern rules
- **Component Structure**: Organized, reusable components
- **Custom Hooks**: Reusable state logic
- **Error Handling**: Comprehensive error boundaries

## 🔄 Offline Support

The application includes a service worker that caches:
- Application shell (HTML, CSS, JS)
- Static assets and fonts
- API responses (with cache-first strategy)

## 📊 Features by User Role

### Principal Admin
- System-wide oversight and analytics
- Company management and billing
- Platform settings and maintenance

### Company Admin
- Full company data access
- User management and permissions
- Financial oversight and reporting

### Project Manager
- Project creation and management
- Team assignment and supervision
- Budget tracking and reporting

### Foreman
- Task management for assigned crews
- Safety incident reporting
- Progress updates and documentation

### Operative
- Time tracking and task updates
- Safety incident reporting
- Document access and photo uploads

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use ESLint configuration provided
3. Add appropriate type definitions
4. Include error handling
5. Test responsive design
6. Update documentation as needed

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support or feature requests, please contact the development team.

---

**Built with ❤️ by AS Agents Development Team**
