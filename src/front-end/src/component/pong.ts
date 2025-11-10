import Page from '../template/page.ts';

export default class SinglePong extends Page {
  private multiplayer: boolean;
  private socket?: WebSocket;
  private game_data?: any;
  private isaigame :boolean = false;

  constructor(id: string, router: { navigate: (path: string) => void }, options?: any) {
    super(id, router, options); // ✅ Pass required args
    this.multiplayer = options?.multiplayer ?? false;
    this.socket = options?.socket;
    this.game_data = options?.game_data;
    this.isaigame = options?.isaigame;
  }

  async render(): Promise<HTMLElement> {
    const CONTAINER = document.createElement('div');
    CONTAINER.id = this.id;
    CONTAINER.style.display = 'flex';
    CONTAINER.style.flexDirection = 'column';
    CONTAINER.style.alignItems = 'center';
    CONTAINER.style.justifyContent = 'center';
    // CONTAINER.style.height = '100vh';
    CONTAINER.style.textAlign = 'center';

    const _score = document.createElement('div');
    _score.style.display = 'flex';
    _score.style.justifyContent = 'space-between';
    _score.style.width = '800px';
    _score.style.marginBottom = '1rem';
    _score.style.marginTop = '2rem';
    _score.style.fontSize = '1.25rem'; 
    _score.style.letterSpacing = '1px';
    _score.id = 'score';

    const div_p1 = document.createElement('div');
    div_p1.style.display = 'flex';
    div_p1.style.flexDirection = 'row';
    div_p1.style.padding = '16px';
    div_p1.style.borderRadius = '12px';
    div_p1.style.backgroundColor = '#202020ff';
    div_p1.style.border = '1px solid #ffffff26'
    const p1 = document.createElement('span');
    p1.id = 'player1-score';
    p1.textContent = 'Player 1: 0';
    // const tt = document.createElement('span');
    // tt.textContent = 'Player 2: 0';
    // tt.style.fontSize = '11px';
    // tt.style.marginTop = '2px';
    // div_p1.appendChild(tt);
    const img_p1 = document.createElement('img');
    img_p1.style.width = '64px';
    img_p1.style.height = '64px';
    img_p1.style.borderRadius = '50%';
    img_p1.style.border = '2px solid white';

    img_p1.src = this.game_data?.player_pfps[1];
    div_p1.appendChild(img_p1);
    div_p1.appendChild(p1);
    _score.appendChild(div_p1);

    const max_score = document.createElement('span');
    max_score.id = 'max-score';
    max_score.textContent = `Max Score: ${this.game_data ? this.game_data.max_score: 20}`;
    max_score.style.opacity = '0.7';
    max_score.style.fontSize = '0.85rem';
    max_score.style.flex = '1';
    max_score.style.textAlign = 'center';
    _score.appendChild(max_score);

    const div_p2 = document.createElement('div');
    div_p2.style.display = 'flex';
    div_p2.style.flexDirection = 'row';
    div_p2.style.padding = '16px';
    div_p2.style.borderRadius = '12px';
    div_p2.style.backgroundColor = '#202020ff';
    div_p2.style.border = '1px solid #ffffff26';
    const p2 = document.createElement('span');
    p2.id = 'player2-score';
    p2.textContent = 'Player 2: 0';
    // const t = document.createElement('span');
    // t.textContent = 'Player 2: 0';
    // t.style.fontSize = '11px';
    // t.style.marginTop = '2px';
    // div_p2.appendChild(t);
    const img_p2 = document.createElement('img');
    img_p2.style.width = '64px';
    img_p2.style.height = '64px';
    img_p2.style.borderRadius = '50%';
    img_p2.style.border = '2px solid white';
    img_p2.src = this.game_data?.player_pfps[0];
    div_p2.appendChild(p2);
    div_p2.appendChild(img_p2);
    _score.appendChild(div_p2);
    
    
    CONTAINER.appendChild(_score);
    const c = document.createElement('canvas');
    c.id = 'pongCanvas';
    c.width = 1200;  // Set your desired width
    c.height = 600; // Set your desired height
    CONTAINER.appendChild(c);


    this.initPong(c, p1, p2);
    return CONTAINER;
  }

  private initPong(canvas: HTMLCanvasElement, p1ScoreEl: HTMLElement, p2ScoreEl: HTMLElement): void {
    const ctx = canvas.getContext('2d')!;
    if (!ctx) {
      return;
    }

    // [GAME] state...
    // and constants
    let g_started = false;
    const 
        PADDLE_WIDTH =  this.game_data?.paddleWidth ? (this.game_data?.paddleWidth) : 10, 
        PADDLE_HEIGHT = this.game_data?.paddleHeight ? (this.game_data?.paddleHeight) : 80, 
        PADDLE_SPEED = 5;
    const BALL_RADIUS = 10, DEFAULT_BALL_SPEED = 5;
    const _g = {
      ball: { x: canvas.width / 2, y: canvas.height / 2, speedX: DEFAULT_BALL_SPEED, speedY: DEFAULT_BALL_SPEED },
      paddles: { player1Y: canvas.height / 2 - PADDLE_HEIGHT / 2, player2Y: canvas.height / 2 - PADDLE_HEIGHT / 2 },
      score: { player1: 0, player2: 0 },
      keys: { w: false, s: false, ArrowUp: false, ArrowDown: false, ' ': false },
      player_names: ["Player_1", "Player_2"],
      max_score: 20,
      ended: false,
      winning: null
    };
    if(this.multiplayer || this.isaigame)
    {
      if(this.game_data)
      {
        _g.player_names = this.game_data?.player_names;
        _g.max_score = this.game_data?.max_score;
      }
    }

    const PONG_ART = 
    `██████╗ ███████╗███╗   ██╗ ██████╗ 
      ██╔══██╗██║   ██║████╗  ██║██╔════╝ 
      ██████╔╝██║   ██║██╔██╗ ██║██║  ███╗
      ██╔═══╝ ██║   ██║██║╚██╗██║██║   ██║
      ██║     ╚██████╔╝██║ ╚████║╚██████╔╝
      ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝`;

    const treat_socket = async () => 
    {
      if(!this.socket)
          return ;
      this.socket.addEventListener('message', async (msg) => {
        if(_g.ended)
          return ;
        const data = await JSON.parse(msg.data);
        // handle queue, creating, etc...
        if (data?.type === "game_state"){
            if(data?.ball)
            {
              _g.ball.x = data?.ball.x;
              _g.ball.y = data?.ball.y;
            }
            if(data?.scores)
            {
              _g.score.player1 = data?.scores.p1;
              _g.score.player2 = data?.scores.p2;

              p1ScoreEl.textContent = `${_g.player_names[0]}: ${_g.score.player1}`;
              p2ScoreEl.textContent = `${_g.player_names[1]}: ${_g.score.player2}`;
            }
            if(data?.paddles)
            {
              _g.paddles.player1Y = data?.paddles.p1;
              _g.paddles.player2Y = data?.paddles.p2;
            }
        }
        if(data?.type === "game_end")
        {
            // !
            _g.ended = (true);
            _g.winning = (data?.you_are_winner);
            // !
            const E = document.querySelector('#max-score') as HTMLParagraphElement;
            E.innerHTML = '';

            const F = document.querySelector('#score') as HTMLParagraphElement;
            const victory = document.createElement('h1');
            victory.textContent = 'Defeat';
            victory.style.color = 'red';
            if( _g.winning ){
                victory.textContent = 'Victory';
                victory.style.color = 'green';
            }
            const e = document.createElement('h3');
            e.style.color = 'cyan';
            if(data?.reason == "give-up")
              e.textContent = `${data?.looser} gave up..`;
            else
              e.textContent = `${data?.winner} was better !`;
            e.style.textAlign = 'center';
            victory.style.textAlign = 'center';
            victory.style.marginBottom = '0px';
            e.style.marginTop = '3px';
            F.style.display = 'flex';
            F.style.flexDirection = 'column';
            F.appendChild(victory);
            F.appendChild(e);
        } 
      });
    }
    treat_socket();

    const update = () => {
      if(this.multiplayer || this.isaigame)
      {
        if(!this.socket)
            return;
        // update() state happens in tereat_socket() via ws
        // only keyboard inputs are sent in this update() loop
        let direction = null;
        if (_g.keys.ArrowUp || _g.keys.w  ){
          direction = "up";
        }
        if(_g.keys.ArrowDown || _g.keys.s ){
          direction = "down";
        }
        if(direction)
        {
          this.socket.send(JSON.stringify({
              type: "paddle_move",
              direction: direction
          }));
        }
      }else
      {
        if (!g_started) return;

        // ball
        _g.ball.x += _g.ball.speedX;
        _g.ball.y += _g.ball.speedY;

        // paddles
        if (_g.keys.ArrowUp && _g.paddles.player2Y > 0 + PADDLE_SPEED) _g.paddles.player2Y -= PADDLE_SPEED;
        if (_g.keys.ArrowDown &&  _g.paddles.player2Y < canvas.height - PADDLE_SPEED) _g.paddles.player2Y += PADDLE_SPEED;

        // ball -> top/bottom walls
        if (_g.ball.y + BALL_RADIUS > canvas.height || _g.ball.y - BALL_RADIUS < 0) {
          _g.ball.speedY = -_g.ball.speedY;
        }

        _paddle_collision(_g.paddles.player1Y, 20 + PADDLE_WIDTH, 1);
        _paddle_collision(_g.paddles.player2Y, canvas.width - 30, -1);

        if (_g.ball.x + BALL_RADIUS > canvas.width) {
          _g.score.player1++;
          p1ScoreEl.textContent = `Player 1: ${_g.score.player1}`;
          _g.ball.speedX = - (_g.ball.speedX);
        } else if (_g.ball.x - BALL_RADIUS < 0) {
          _g.score.player2++;
          p2ScoreEl.textContent = `Player 2: ${_g.score.player2}`;
          _g.ball.speedX = - (_g.ball.speedX);
        }
      }

    };

    const _paddle_collision = (paddleY: number, paddleX: number, direction: 1 | -1) => {
        const b = _g.ball;
        const paddleCollision = direction === 1
            ? b.x - BALL_RADIUS < paddleX
            : b.x + BALL_RADIUS > paddleX;

        if (paddleCollision && b.y > paddleY && b.y < paddleY + PADDLE_HEIGHT)
        {
            const inter_y = ( paddleY + PADDLE_HEIGHT / 2 - b.y) / (PADDLE_HEIGHT / 2);

            b.speedX = DEFAULT_BALL_SPEED * Math.cos(inter_y * (Math.PI / 3)) * direction;
            b.speedY = DEFAULT_BALL_SPEED * -Math.sin(inter_y * (Math.PI / 3));
            b.speedX *= 1.025;
            b.speedY *= 1.025;
        }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // field
      ctx.strokeStyle = _g.ended ? ( _g.winning ? 'green' : 'red') : 'white';
      ctx.lineWidth = 5;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // PONG title with transparency
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = 'white';
      ctx.font = '32px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      const lines = PONG_ART.split('\n');
      const lineHeight = 35;
      const startY = (canvas.height - (lines.length * lineHeight)) / 2 + lineHeight;
      lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
      });
      ctx.restore();
      // ball
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(_g.ball.x, _g.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // paddles
      ctx.fillRect(20, _g.paddles.player1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(canvas.width - 30, _g.paddles.player2Y, PADDLE_WIDTH, PADDLE_HEIGHT);
    };

    const gameLoop = () => {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    };

    // Event Listeners
    const handleKeyEvent = (e: KeyboardEvent, isDown: boolean) => {
      if (e.key === ' ' && isDown && !g_started) {
        /* 
        reset_ball(true); */
      }
      // movement keys
      else if (e.key === 'w' || e.key === 's' || e.key === 'ArrowUp' || e.key === 'ArrowDown')
      {
        e.preventDefault(); // ✅ Prevent arrow keys and WASD from scrolling
        (_g.keys as any)[e.key] = isDown;
      }
    };
    document.addEventListener('keydown', (e) => handleKeyEvent(e, true));
    document.addEventListener('keyup', (e) => handleKeyEvent(e, false));

    gameLoop();
  }
}