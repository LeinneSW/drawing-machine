// 👉 DOM
const addBtn = document.getElementById('addBtn');
const drawBtn = document.getElementById('drawBtn');
const listEl = document.getElementById('participantsList');
const countEl = document.getElementById('count');

const modal = document.getElementById('drawModal');
const scrollingList = document.getElementById('scrollingList');
const stopBtn = document.getElementById('stopBtn');
const closeBtn = document.getElementById('closeBtn');
const resultEl = document.getElementById('result');

let animationId = null
let participants = (() => {
    try{
        const json = JSON.parse(localStorage.getItem('items') || '[]')
        if(Array.isArray(json)){
            return json;
        }
    }catch{}
    localStorage.setItem('items', '[]')
    return []
})()

const renderList = () => {
    listEl.innerHTML = participants.map(n => `<li ondblclick='removeItem(this.textContent)'>${n}</li>`).join('');
    countEl.textContent = participants.length + '';
}

const addItem = (...names) => {
    participants.push(...names);
    localStorage.setItem('items', JSON.stringify(participants))
    renderList();
}

const removeItem = (name) => {
    participants = participants.filter(v => v !== name)
    localStorage.setItem('items', JSON.stringify(participants))
    renderList();
}

// 스크롤 리스트 구성
function setupModal(){
    const items = shuffle(participants);
    for(let i = 0; i < 5; i++) items.push(...items);
    scrollingList.innerHTML = items.map(n => `<li>${n}</li>`).join('');
}

function shuffle(arr){ // 피셔–예이츠
    const result = [...arr]
    for(let i = result.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

renderList()

/* --------------------------------------------------------
 * 참가자 추가 (Prompt 입력)
 * ------------------------------------------------------*/
addBtn.addEventListener('click', () => {
    const input = prompt('참가자 이름을 입력하세요 (콤마로 구분)');
    if(!input) return;
    const names = input.split(',').map(n => n.trim()).filter(v => v.length >= 2);
    addItem(...names)
});

/* --------------------------------------------------------
 *    duration : 회전 유지 시간(ms)
 *    speed    : px/frame
 *    accel    : 가속 시간
 *    decel    : 감속 시간
 * ------------------------------------------------------*/
function startDraw(duration, speed, accel, decel){
    duration += accel + decel;
    if(!participants.length){
        alert('추첨할 대상을 먼저 추가해주세요!');
        return;
    }

    setupModal();
    modal.classList.remove('hidden');
    resultEl.classList.add('hidden');

    stopBtn.disabled = false;
    stopBtn.onclick = () => (stopTriggered = true);
    closeBtn.onclick = stopDraw;

    const itemHeight = scrollingList.querySelector('li').getBoundingClientRect().height;
    const randomIndex = participants.length + Math.floor(Math.random() * participants.length)
    const baseTarget = scrollingList.children[randomIndex].offsetTop - (scrollingList.clientHeight / 2 - itemHeight / 2);
    scrollingList.scrollTo({top: baseTarget});

    let v = 0.1;            // px/frame
    let maxV = v;
    let prevIndex = null;       // 실시간 강조용
    let slowStart = null;
    let stopTriggered = false;

    const t0 = performance.now();
    animationId = requestAnimationFrame(step);
    const maxScroll = scrollingList.scrollHeight - scrollingList.clientHeight - itemHeight;

    let scroll = scrollingList.scrollTop
    function step(now){
        const elapsed = now - t0;
        elapsed >= duration && (stopTriggered = true); // 자동 종료 예약
        if(stopTriggered){
            if(slowStart === null){
                slowStart = now;
                stopBtn.disabled = true;
            }
            const p = Math.min(1, (now - slowStart) / decel); // 감속에 걸리는시간, ms
            v = Math.min(maxV, speed) * (1 - p * p);         // ease‑out(quad)
        }else{
            const p = Math.min(1, elapsed / accel); // 가속에 걸리는시간, ms
            v = speed * (p * p);                   // ease‑in(quad)
        }
        maxV = Math.max(v, maxV)

        // 직접 가산/감산시 소수값이 일부 누락됨
        scrollingList.scrollTop = (scroll += v);
        if(scrollingList.scrollTop >= maxScroll){
            scrollingList.scrollTop = (scroll -= itemHeight * participants.length * 15);
        }

        highlightCenter();
        if(stopTriggered && v < 0.15){
            alignAndFinish();
        }else{
            animationId = requestAnimationFrame(step);
        }
    }

    /* 현재 중앙 항목 하이라이트 */
    function highlightCenter(){
        // 가시 영역 정중앙의 절대 위치(px)
        const centerLine = scrollingList.scrollTop + scrollingList.clientHeight / 2;

        // 중앙선이 몇 번째 행에 들어왔는지 계산
        const index = Math.floor(centerLine / itemHeight);

        // 선택 갱신
        if(prevIndex !== index){
            // TODO: Play Sound
            scrollingList.children[index].classList.add('selected');
            scrollingList.children[prevIndex]?.classList.remove('selected');
            prevIndex = index;
        }
    }

    /* 가장 인접한 항목으로 이동 */
    function alignAndFinish(){
        const sel = scrollingList.children[prevIndex]
        const baseTarget = sel.offsetTop - (scrollingList.clientHeight / 2 - itemHeight / 2);
        scrollingList.onscrollend = async () => {
            scrollingList.onscrollend = null
            await new Promise(resolve => setTimeout(resolve, 200));
            resultEl.classList.remove('hidden');
            showConfetti()
            resultEl.textContent = `🎉 당첨: ${sel.textContent}!`;
            const audio = new Audio('./tada.flac');
            audio.volume = 0.75;
            audio.play().catch(() => {})
        };
        scrollingList.scrollTo({top: baseTarget, behavior: 'smooth'});
    }
}
const stopDraw = () => {
    modal.classList.add('hidden')
    animationId && cancelAnimationFrame(animationId)
}

drawBtn.addEventListener('click', () => startDraw(5000, 4.5, 2200, 2200));
//document.onkeydown = e => e.key === 'Escape' && stopDraw();

/**
 * 화면 전체에 컨페티를 뿌립니다.
 * 중첩 호출 시 기존 이펙트가 끝난 뒤 새로 실행됩니다.
 */
function showConfetti(){
    // 이미 실행 중이면 무시
    if(document.querySelector('.confetti-canvas')) return;

    /* ---------- 캔버스 준비 ---------- */
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize(){
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    resize();
    window.addEventListener('resize', resize);

    /* ---------- 파티클 초기화 ---------- */
    const colors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#577590', '#277da1'];
    let particles = Array.from({length: 200}, () => ({ // length개의 컨페티
        x: Math.random() * window.innerWidth,
        y: Math.random() * -window.innerHeight,          // 위쪽에서 시작
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 0.2,
        size: 6 + Math.random() * 8,
        velX: (Math.random() - 0.5) * 4,
        velY: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
    }));

    /* ---------- 애니메이션 루프 ---------- */
    (function frame(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.velX;
            p.y += p.velY;
            p.angle += p.spin;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        /* --- 화면을 벗어난 파티클 제거 --- */
        particles = particles.filter(p =>
            p.y < window.innerHeight + 40 &&
            p.x > -40 &&
            p.x < window.innerWidth + 40
        );

        /* --- 다음 프레임 또는 정리 --- */
        if(particles.length){
            requestAnimationFrame(frame);
        }else{
            canvas.remove();
            window.removeEventListener('resize', resize);
        }
    })();
}