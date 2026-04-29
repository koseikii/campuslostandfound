# Campus Lost & Found System

A comprehensive web-based lost and found management system for campus communities with Firebase integration.

## Features

- **User Authentication**: Secure login and registration system
- **Item Management**: Report lost/found items with detailed descriptions
- **Advanced Search**: Find items by category, location, date range
- **Admin Dashboard**: Manage users and items
- **Real-time Notifications**: Email alerts for matches
- **Responsive Design**: Works on desktop and mobile devices
- **Firebase Integration**: Cloud-based data persistence

## Technologies

- Frontend: HTML5, CSS3, JavaScript
- Backend: Firebase (Authentication, Firestore, Storage)
- Hosting: Vercel

## Getting Started

### Prerequisites
- Node.js (for local development)
- Firebase project setup
- Vercel account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/koseiki/pcdscampuslostandfound.git
cd pcdscampuslostandfound
```

2. Open `public/index.html` in a web browser

3. Configure Firebase credentials in `public/js/firebase-init.js`

## Firebase Setup

The application uses Firebase for:
- User authentication
- Data storage (Firestore)
- File storage (Cloud Storage)

See `README_FIREBASE.md` for detailed Firebase setup instructions.

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

The application will be deployed to a Vercel URL automatically.

## Project Structure

```
public/
├── index.html           # Main application file
├── styles.css          # Global styles
├── js/                 # JavaScript modules
│   ├── firebase-*.js   # Firebase integration
│   └── functions/      # Feature modules
└── html/               # Additional HTML pages
```

## Security

- All data is encrypted in transit (HTTPS)
- Firestore security rules enforce authentication
- User passwords are hashed by Firebase Auth
- Session management with localStorage

## Documentation

- [Firebase Setup Guide](README_FIREBASE.md)
- [Firebase Testing Guide](FIREBASE_TESTING_GUIDE.md)
- [Implementation Guide](IMPLEMENTATION_GUIDE.md)
- [Firestore Security Rules](FIRESTORE_SECURITY_RULES.txt)

## License

This project is confidential and for use by authorized users only.

## Support

For issues or feature requests, please contact the development team.
