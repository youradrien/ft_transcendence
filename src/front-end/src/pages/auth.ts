// src/auth/index.ts
import Page from '../template/page.ts';

export default class AuthPage extends Page {
  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.id = this.id;

    container.innerHTML = `
      <style>

        .auth-container {
          border-radius: 20px;
          padding: 40px;
          width: 320px;
          margin-left: auto;
          margin-right: auto;
          box-shadow: 0 8px 32px rgba(45, 45, 45, 0.37);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(81, 81, 81, 0.18);
          text-align: center;
        }

        .auth-container h2 {
          margin-bottom: 20px;
        }

        .auth-container input {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border-radius: 8px;
          border: none;
          color: white;
          font-size: 14px;
        }

        .auth-container input::placeholder {
          color: #ddd;
        }

        .auth-container button {
          width: 100%;
          padding: 10px;
          margin: 15px 0;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          color: white;
          transition: background 0.3s ease;
        }
        .error-message {
          color: red;
          font-size: 14px;
          margin-top: 10px;
          min-height: 20px;
        }


        .toggle-link {
          color: #ccc;
          cursor: pointer;
          font-size: 14px;
        }

        .toggle-link:hover {
          text-decoration: underline;
        }
      </style>

      <h1>Welcome to Transcendance</h1>
      <div class="auth-container">
        <h2 id="formTitle">Login</h2>
        <input type="text" id="username" placeholder="Username" required />
        <input type="password" id="password" placeholder="Password" required />
        <p id="errorMsg" class="error-message"></p>
        <button id="submitBtn">Login</button>
        <button id="githubLogin">Login with GitHub</button>
        <button id="googleLogin">Login with Google</button>
        <p class="toggle-link" id="toggleForm">Don't have an account? Register</p>
      </div>
    `;

    // JavaScript logic
    const formTitle = container.querySelector('#formTitle') as HTMLElement;
    const submitBtn = container.querySelector('#submitBtn') as HTMLButtonElement;
    const toggleForm = container.querySelector('#toggleForm') as HTMLElement;

    // Bouton GitHub login
    const githubLoginBtn = container.querySelector('#githubLogin') as HTMLButtonElement;
    githubLoginBtn.addEventListener('click', () => {
      // Redirige vers le backend
      window.location.href = 'http://localhost:3010/api/auth/github/login';
    });

    const googleLoginBtn = container.querySelector("#googleLogin") as HTMLButtonElement;
    googleLoginBtn.addEventListener('click', () => {
      // Redirige vers le backend
      window.location.href = 'http://localhost:3010/api/auth/google/login';
    });



    let isLogin = true;

    toggleForm.addEventListener('click', () => {
      isLogin = !isLogin;
      formTitle.textContent = isLogin ? 'Login' : 'Register';
      submitBtn.textContent = isLogin ? 'Login' : 'Register';
      toggleForm.textContent = isLogin
        ? "Don't have an account? Register"
        : "Already have an account? Login";
    });

    submitBtn.addEventListener('click', async () => {
      const username = (container.querySelector('#username') as HTMLInputElement).value.trim();
      const password = (container.querySelector('#password') as HTMLInputElement).value.trim();
      const errorMsg = container.querySelector('#errorMsg') as HTMLElement;


      if (!username || !password) {
        // alert('Please fill in all fields.');
        errorMsg.textContent = 'nope'; // clear previous error
        return;
      }

      try {
        const endpoint = isLogin ? 'http://localhost:3010/api/login' : 'http://localhost:3010/api/register';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // <- this sends/receives cookies
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        console.log(data);

        if (!response.ok) throw new Error(data?.error || 'Unknown error');
        // Handle success (e.g. redirect to main page)
        alert(data.message || (isLogin ? 'Logged in!' : 'Registered!'));
        this.router.navigate('/'); // go back to main page

      } catch (err: any) {
        alert('Error: ' + err.message);
      }
    });

    return container;
  }
}
