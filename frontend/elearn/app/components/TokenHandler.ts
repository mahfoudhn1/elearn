// // components/TokenHandler.tsx
// import { useEffect } from 'react';
// import { useDispatch } from 'react-redux';
// import { loginSuccess } from '../../store/authSlice'; // Adjust the path as needed

// const TokenHandler: React.FC = () => {
//     const dispatch = useDispatch();
//     useEffect(() => {
//         // Example: Fetch user data from your backend after login
//         fetch('http://localhost:8000/api/users/', {
//           method: 'GET',
//           credentials: 'include' // Ensure cookies are sent with requests
//         })
//           .then(response => response.json())
//           .then(data => {
//             console.log(data);
            
//             if (data.user) {
//              dispatch(loginSuccess(data.user));
//              window.location.href = '/'; // Adjust redirection as needed
//             }
//           })
//           .catch(error => console.error('Error fetching user data:', error));
//       }, [dispatch]);
    
    

//     return null;
// };

// export default TokenHandler;


