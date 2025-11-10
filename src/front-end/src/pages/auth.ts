// src/auth/index.ts
import Page from '../template/page.ts';

export default class AuthPage extends Page {
  async render(): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.id = this.id;

 container.innerHTML = `
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    
    <style>
      /* bgcgradient animation */
      body, #${this.id} {
        margin: 0;
        padding: 0;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Press Start 2P', cursive;
        background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
        background-size: 600% 600%;
        animation: gradientBG 15s ease infinite;
      }

      @keyframes gradientBG {
        0% {background-position: 0% 50%;}
        50% {background-position: 100% 50%;}
        100% {background-position: 0% 50%;}
      }

      /* Auth container with glow and glass effect */
      .auth-container {
        border-radius: 20px;
        padding: 40px;
        margin: 40px;
        width: 360px;
        background: rgba(0,0,0,0.35);
        box-shadow: 0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(191, 0, 255, 0.4);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 2px solid rgba(81, 81, 81, 0.3);
        text-align: center;
        animation: fadeIn 1s ease forwards;
      }

      @keyframes fadeIn {
        from {opacity: 0; transform: translateY(-20px);}
        to {opacity: 1; transform: translateY(0);}
      }

      .auth-container h2 {
        margin-bottom: 25px;
        color: #00ffff;
        text-shadow: 0 0 6px #0ff, 0 0 12px #0ff, 0 0 18px #0ff;
      }

      .auth-container input {
        width: 100%;
        padding: 12px;
        margin: 12px 0;
        border-radius: 8px;
        border: none;
        background: rgba(255,255,255,0.05);
        color: #fff;
        font-size: 12px;
        transition: all 0.3s ease;
      }

      .auth-container input::placeholder {
        color: #888;
      }

      .auth-container input:focus {
        outline: none;
        background: rgba(0,255,255,0.1);
        box-shadow: 0 0 10px #0ff;
      }

      .auth-container button {
        width: 100%;
        padding: 12px;
        margin: 15px 0;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        color: #000;
        background: linear-gradient(90deg, #00ffff,rgb(221, 0, 255));
        transition: all 0.4s ease;
        text-shadow: 0 0 6px #fff;
      }

      .auth-container button:hover {
        transform: scale(1.05);
        box-shadow: 0 0 20px #0ff, 0 0 30px #f0f, 0 0 40px #0ff;
      }

      .error-message {
        color: #ff4c4c;
        font-size: 12px;
        margin-top: 10px;
        min-height: 20px;
        text-shadow: 0 0 3px #f00;
      }

      .toggle-link {
        color: #ccc;
        cursor: pointer;
        font-size: 12px;
        transition: color 0.3s;
      }

      .toggle-link:hover {
        color: #0ff;
        text-decoration: underline;
      }

      h1, h2 {
        color: #00ffff;
        text-align: center;
        font-size: 38px;
        margin-bottom: 40px;
        text-shadow: 0 0 8px #0ff, 0 0 16px #0ff;
        margin: 0 auto;
        animation: glow 2s ease-in-out infinite alternate;
      }
      h2{
        font-size: 16px;
      }

      @keyframes glow {
        from { text-shadow: 0 0 4px #0ff, 0 0 10px #0ff;}
        to { text-shadow: 0 0 12px #0ff, 0 0 20px #0ff, 0 0 30px #f0f;}
      }
    </style>

    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; font-family: 'Press Start 2P', cursive; color: #00ffff;">
      <h1>Transcendance</h1>
      <h2>Play Online now for free!</h2>
      <h3 style="font-size: 15px; color: #CCC;">
        Powered by 
        <a href="https://github.com/youradrien" target="_blank" style="cursor: pointer !important; color:#00ffff; margin:0 5px; text-decoration:none; transition: all 0.3s;">youradrien</a>,
        <a href="https://github.com/username3" target="_blank" style="cursor: pointer !important; color:#ffae00; margin:0 5px; text-decoration:none; transition: all 0.3s;">gauthier</a>,
        <a href="https://github.com/username4" target="_blank" style="cursor: pointer !important; color:#00ff00; margin:0 5px; text-decoration:none; transition: all 0.3s;">aewrewr</a> and
        <a href="https://github.com/youradrien" target="_blank" style="cursor: pointer !important; color:#ff00ff; margin:0 5px; text-decoration:none; transition: all 0.3s;">@Adrien</a>,

      </h3>
    </div>


    <div class="auth-container">
      <h2 id="formTitle">Login</h2>
      <input type="text" id="username" placeholder="Username" required />
      <input type="password" id="password" placeholder="Password" required />
      <p id="errorMsg" class="error-message"></p>
      <button id="submitBtn">Login</button>
      <p class="toggle-link" id="toggleForm">Don't have an account? Register</p>
    </div>
  `;

    // JavaScript logic
    const formTitle = container.querySelector('#formTitle') as HTMLElement;
    const submitBtn = container.querySelector('#submitBtn') as HTMLButtonElement;
    const toggleForm = container.querySelector('#toggleForm') as HTMLElement;

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
        // console.log(data);

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
