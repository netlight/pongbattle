//=============================================================================
// PONG
//=============================================================================

function Pong(runner, cfg) {
	var that = this;
		Game.loadImages(Pong.Images, function(images) {
			that.cfg         = cfg;
			that.runner      = runner;
			that.width       = runner.width;
			that.height      = runner.height;
			that.images      = images;
			that.playing     = false;
			that.scores      = [0, 0];
			that.court       = Object.construct(Pong.Court,  that);
			that.leftPaddle  = Object.construct(Pong.Paddle, that, false, cfg.aiFunc1);
			that.rightPaddle = Object.construct(Pong.Paddle, that, true, cfg.aiFunc2);
			that.ball        = new Pong.Ball(that);
			that.sounds      = Object.construct(Pong.Sounds, that);
			that.runner.start();
			cfg.onLoad(that);
		});
	};
Pong.Defaults = {
	width: 640,   // logical canvas width (browser will scale to physical canvas size - which is controlled by @media css queries)
	height: 480,   // logical canvas height (ditto)
	wallWidth: 12,
	paddleWidth: 12,
	paddleHeight: 60,
	paddleSpeed: 2,     // should be able to cross court vertically   in 2 seconds
	ballSpeed: 4,     // should be able to cross court horizontally in 4 seconds, at starting speed ...
	ballAccel: 8,     // ... but accelerate as time passes
	ballRadius: 5,
	sound: true,
	aiFunc1: function () {
		return 0;
	},
	aiFunc2: function () {
		return 0;
	},
	onLoad: function() {}
};

Pong.Colors = {
	walls: '#36185F',
	ball: '#CC9933',
	score: '#36185F',
	footprint: '#333',
	predictionGuess: 'yellow',
	predictionExact: 'red'
};

Pong.prototype.start = function(numPlayers) {
	if (!this.playing) {
		this.scores = [0, 0];
		this.playing = true;
		this.leftPaddle.setAuto(numPlayers < 1, this.level(0));
		this.rightPaddle.setAuto(numPlayers < 2, this.level(1));
		this.ball.reset();
		this.runner.hideCursor();
	}
};

Pong.prototype.stop = function(ask) {
		if (this.playing) {
			if (!ask || this.runner.confirm('Abandon game in progress ?')) {
				this.playing = false;
				this.leftPaddle.setAuto(false);
				this.rightPaddle.setAuto(false);
				this.runner.showCursor();
			}
		}
	};

Pong.prototype.level = function(playerNo) {
		return 8 + (this.scores[playerNo] - this.scores[playerNo ? 0 : 1]);
	};

Pong.prototype.goal = function(playerNo) {
		this.sounds.goal();
		this.scores[playerNo] += 1;
		if (this.scores[playerNo] == 9) {
			this.cfg.onWin(playerNo, this.scores[0], this.scores[1]);
			this.stop();
		}
		else {
			this.ball.reset(playerNo);
		}
	};

	Pong.prototype.update = function(dt) {
		this.leftPaddle.update(dt, this.ball);
		this.rightPaddle.update(dt, this.ball);
		if (this.playing) {
			var dx = this.ball.dx;
			var dy = this.ball.dy;
			this.ball.update(dt, this.leftPaddle, this.rightPaddle);
			if (this.ball.dx < 0 && dx > 0)
				this.sounds.ping();
			else if (this.ball.dx > 0 && dx < 0)
				this.sounds.pong();
			else if (this.ball.dy * dy < 0)
				this.sounds.wall();

			if (this.ball.left > this.width)
				this.goal(0);
			else if (this.ball.right < 0)
				this.goal(1);
		}
	};

Pong.prototype.draw = function(ctx) {
		this.court.draw(ctx, this.scores[0], this.scores[1]);
		this.leftPaddle.draw(ctx);
		this.rightPaddle.draw(ctx);
		if (this.playing)
			this.ball.draw(ctx);
		else
			this.menu.draw(ctx);
	};

	//=============================================================================
	// SOUNDS
	//=============================================================================

Pong.Sounds = {

		initialize: function(pong) {
			this.game      = pong;
			this.supported = Game.ua.hasAudio;
			if (this.supported) {
				this.files = {
					ping: Game.createAudio("sounds/ping.wav"),
					pong: Game.createAudio("sounds/pong.wav"),
					wall: Game.createAudio("sounds/wall.wav"),
					goal: Game.createAudio("sounds/goal.wav")
				};
			}
		},

		play: function(name) {
			if (this.supported && this.game.cfg.sound && this.files[name])
				this.files[name].play();
		},

		ping: function() { this.play('ping'); },
		pong: function() { this.play('pong'); },
		wall: function() { /*this.play('wall');*/ },
		goal: function() { /*this.play('goal');*/ }

	};

	//=============================================================================
	// COURT
	//=============================================================================

Pong.Court = {

		initialize: function(pong) {
			var w  = pong.width;
			var h  = pong.height;
			var ww = pong.cfg.wallWidth;

			this.ww    = ww;
			this.walls = [];
			this.walls.push({x: 0, y: 0,      width: w, height: ww});
			this.walls.push({x: 0, y: h - ww, width: w, height: ww});
			var nMax = (h / (ww*2));
			for(var n = 0 ; n < nMax ; n++) { // draw dashed halfway line
				this.walls.push({x: (w / 2) - (ww / 2),
					y: (ww / 2) + (ww * 2 * n),
					width: ww, height: ww});
			}

			var sw = 3*ww;
			var sh = 4*ww;
			this.score1 = {x: 0.5 + (w/2) - 1.5*ww - sw, y: 2*ww, w: sw, h: sh};
			this.score2 = {x: 0.5 + (w/2) + 1.5*ww,      y: 2*ww, w: sw, h: sh};
		},

		draw: function(ctx, scorePlayer1, scorePlayer2) {
			ctx.fillStyle = Pong.Colors.walls;
			for(var n = 0 ; n < this.walls.length ; n++)
				ctx.fillRect(this.walls[n].x, this.walls[n].y, this.walls[n].width, this.walls[n].height);
			this.drawDigit(ctx, scorePlayer1, this.score1.x, this.score1.y, this.score1.w, this.score1.h);
			this.drawDigit(ctx, scorePlayer2, this.score2.x, this.score2.y, this.score2.w, this.score2.h);
		},

		drawDigit: function(ctx, n, x, y, w, h) {
			ctx.fillStyle = Pong.Colors.score;
			var dw = dh = this.ww*4/5;
			var blocks = Pong.Court.DIGITS[n];
			if (blocks[0])
				ctx.fillRect(x, y, w, dh);
			if (blocks[1])
				ctx.fillRect(x, y, dw, h/2);
			if (blocks[2])
				ctx.fillRect(x+w-dw, y, dw, h/2);
			if (blocks[3])
				ctx.fillRect(x, y + h/2 - dh/2, w, dh);
			if (blocks[4])
				ctx.fillRect(x, y + h/2, dw, h/2);
			if (blocks[5])
				ctx.fillRect(x+w-dw, y + h/2, dw, h/2);
			if (blocks[6])
				ctx.fillRect(x, y+h-dh, w, dh);
		},

		DIGITS: [
			[1, 1, 1, 0, 1, 1, 1], // 0
			[0, 0, 1, 0, 0, 1, 0], // 1
			[1, 0, 1, 1, 1, 0, 1], // 2
			[1, 0, 1, 1, 0, 1, 1], // 3
			[0, 1, 1, 1, 0, 1, 0], // 4
			[1, 1, 0, 1, 0, 1, 1], // 5
			[1, 1, 0, 1, 1, 1, 1], // 6
			[1, 0, 1, 0, 0, 1, 0], // 7
			[1, 1, 1, 1, 1, 1, 1], // 8
			[1, 1, 1, 1, 0, 1, 0]  // 9
		]

	};

	//=============================================================================
	// PADDLE
	//=============================================================================

Pong.Paddle = {

		initialize: function(pong, rhs, aiFunc) {
			this.pong   = pong;
			this.width  = pong.cfg.paddleWidth;
			this.height = pong.cfg.paddleHeight;
			this.minY   = pong.cfg.wallWidth;
			this.maxY   = pong.height - pong.cfg.wallWidth - this.height;
			this.speed  = (this.maxY - this.minY) / pong.cfg.paddleSpeed;
			this.setpos(rhs ? pong.width - this.width : 0, this.minY + (this.maxY - this.minY)/2);
			this.setdir(0);
			this.aiFunc = aiFunc;
		},

		setpos: function(x, y) {
			this.x      = x;
			this.y      = y;
			this.left   = this.x;
			this.right  = this.left + this.width;
			this.top    = this.y;
			this.bottom = this.y + this.height;
		},

		setdir: function(dy) {
			this.up   = (dy < 0 ? -dy : 0);
			this.down = (dy > 0 ?  dy : 0);
		},

		setAuto: function(on, level) {
			if (on && !this.auto) {
				this.auto = true;
			}
			else if (!on && this.auto) {
				this.auto = false;
				this.setdir(0);
			}
		},

		update: function(dt, ball) {
			var paddleInfo = {
				x: this.x,
				y: this.y,
				minY: this.minY,
				maxY: this.maxY,
				height: this.height,
				width: this.width
			};
			var ballInfo = {
				x: ball.x,
				y: ball.y,
				radius: ball.radius,
				minX: ball.minX,
				maxX: ball.maxX,
				minY: ball.minY,
				maxY: ball.maxY,
				dx: ball.dx,
				dy: ball.dy,
				speed: ball.speed
			};
			var gameInfo = {
				ballAccel: this.pong.cfg.ballAccel,
				ballRadius: this.pong.cfg.ballRadius,
				width: this.pong.cfg.width,
				height: this.pong.cfg.height
			};
			var result = this.aiFunc(paddleInfo, ballInfo, gameInfo);
			var amount = 0;
			if (result === 0) {
				return;
			} else if (result > 0) {
				amount = 1;
			} else {
				amount = -1;
			}
			if (amount != 0) {
				var y = this.y + (amount * dt * this.speed);
				if (y < this.minY)
					y = this.minY;
				else if (y > this.maxY)
					y = this.maxY;
				this.setpos(this.x, y);
			}
		},

		draw: function(ctx) {
			ctx.fillStyle = Pong.Colors.walls;
			ctx.fillRect(this.x, this.y, this.width, this.height);
			if (this.prediction && this.pong.cfg.predictions) {
				ctx.strokeStyle = Pong.Colors.predictionExact;
				ctx.strokeRect(this.prediction.x - this.prediction.radius, this.prediction.exactY - this.prediction.radius, this.prediction.radius*2, this.prediction.radius*2);
				ctx.strokeStyle = Pong.Colors.predictionGuess;
				ctx.strokeRect(this.prediction.x - this.prediction.radius, this.prediction.y - this.prediction.radius, this.prediction.radius*2, this.prediction.radius*2);
			}
		},

		moveUp:         function() { this.up   = 1; },
		moveDown:       function() { this.down = 1; },
		stopMovingUp:   function() { this.up   = 0; },
		stopMovingDown: function() { this.down = 0; }

	};

	//=============================================================================
	// BALL
	//=============================================================================

	Pong.Ball = function(pong) {
		this.pong    = pong;
		this.radius  = pong.cfg.ballRadius;
		this.minX    = this.radius;
		this.maxX    = pong.width - this.radius;
		this.minY    = pong.cfg.wallWidth + this.radius;
		this.maxY    = pong.height - pong.cfg.wallWidth - this.radius;
		this.speed   = (this.maxX - this.minX) / pong.cfg.ballSpeed;
		this.accel   = pong.cfg.ballAccel;
	};

	Pong.Ball.prototype.reset = function(playerNo) {
			this.footprints = [];
			this.setpos(playerNo == 1 ?   this.maxX : this.minX,  Math.floor(this.pong.cfg.seedRandom()*(this.maxY-this.minY))+this.minY);
			this.setdir(playerNo == 1 ? -this.speed : this.speed, this.speed);
		};
	Pong.Ball.prototype.setpos= function(x, y) {
			this.x      = x;
			this.y      = y;
			this.left   = this.x - this.radius;
			this.top    = this.y - this.radius;
			this.right  = this.x + this.radius;
			this.bottom = this.y + this.radius;
		};

	Pong.Ball.prototype.setdir= function(dx, dy) {
			this.dxChanged = ((this.dx < 0) != (dx < 0)); // did horizontal direction change
			this.dyChanged = ((this.dy < 0) != (dy < 0)); // did vertical direction change
			this.dx = dx;
			this.dy = dy;
		};

Pong.Ball.prototype.footprint= function() {
			if (this.pong.cfg.footprints) {
				if (!this.footprintCount || this.dxChanged || this.dyChanged) {
					this.footprints.push({x: this.x, y: this.y});
					if (this.footprints.length > 50)
						this.footprints.shift();
					this.footprintCount = 5;
				}
				else {
					this.footprintCount--;
				}
			}
		};

Pong.Ball.prototype.update= function(dt, leftPaddle, rightPaddle) {

			pos = Pong.Helper.accelerate(this.x, this.y, this.dx, this.dy, this.accel, dt);

			if ((pos.dy > 0) && (pos.y > this.maxY)) {
				pos.y = this.maxY;
				pos.dy = -pos.dy;
			}
			else if ((pos.dy < 0) && (pos.y < this.minY)) {
				pos.y = this.minY;
				pos.dy = -pos.dy;
			}

			var paddle = (pos.dx < 0) ? leftPaddle : rightPaddle;
			var pt     = Pong.Helper.ballIntercept(this, paddle, pos.nx, pos.ny);

			if (pt) {
				switch(pt.d) {
					case 'left':
					case 'right':
						pos.x = pt.x;
						pos.dx = -pos.dx;
						break;
					case 'top':
					case 'bottom':
						pos.y = pt.y;
						pos.dy = -pos.dy;
						break;
				}

				// add/remove spin based on paddle direction
				if (paddle.up)
					pos.dy = pos.dy * (pos.dy < 0 ? 0.5 : 1.5);
				else if (paddle.down)
					pos.dy = pos.dy * (pos.dy > 0 ? 0.5 : 1.5);
			}

			this.setpos(pos.x,  pos.y);
			this.setdir(pos.dx, pos.dy);
			this.footprint();
		};

		Pong.Ball.prototype.draw= function(ctx) {
			var w = h = this.radius * 2;
			ctx.fillStyle = Pong.Colors.ball;
			ctx.fillRect(this.x - this.radius, this.y - this.radius, w, h);
			if (this.pong.cfg.footprints) {
				var max = this.footprints.length;
				ctx.strokeStyle = Pong.Colors.footprint;
				for(var n = 0 ; n < max ; n++)
					ctx.strokeRect(this.footprints[n].x - this.radius, this.footprints[n].y - this.radius, w, h);
			}
		};


	//=============================================================================
	// HELPER
	//=============================================================================

Pong.Helper = {

		accelerate: function(x, y, dx, dy, accel, dt) {
			var x2  = x + (dt * dx) + (accel * dt * dt * 0.5);
			var y2  = y + (dt * dy) + (accel * dt * dt * 0.5);
			var dx2 = dx + (accel * dt) * (dx > 0 ? 1 : -1);
			var dy2 = dy + (accel * dt) * (dy > 0 ? 1 : -1);
			return { nx: (x2-x), ny: (y2-y), x: x2, y: y2, dx: dx2, dy: dy2 };
		},

		intercept: function(x1, y1, x2, y2, x3, y3, x4, y4, d) {
			var denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
			if (denom != 0) {
				var ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
				if ((ua >= 0) && (ua <= 1)) {
					var ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
					if ((ub >= 0) && (ub <= 1)) {
						var x = x1 + (ua * (x2-x1));
						var y = y1 + (ua * (y2-y1));
						return { x: x, y: y, d: d};
					}
				}
			}
			return null;
		},

		ballIntercept: function(ball, rect, nx, ny) {
			var pt;
			if (nx < 0) {
				pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
					rect.right  + ball.radius,
					rect.top    - ball.radius,
					rect.right  + ball.radius,
					rect.bottom + ball.radius,
					"right");
			}
			else if (nx > 0) {
				pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
					rect.left   - ball.radius,
					rect.top    - ball.radius,
					rect.left   - ball.radius,
					rect.bottom + ball.radius,
					"left");
			}
			if (!pt) {
				if (ny < 0) {
					pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
						rect.left   - ball.radius,
						rect.bottom + ball.radius,
						rect.right  + ball.radius,
						rect.bottom + ball.radius,
						"bottom");
				}
				else if (ny > 0) {
					pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
						rect.left   - ball.radius,
						rect.top    - ball.radius,
						rect.right  + ball.radius,
						rect.top    - ball.radius,
						"top");
				}
			}
			return pt;
		}

	};