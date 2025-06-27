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
 *    speed    : px/frame (60fps 기준)
 * ------------------------------------------------------*/
function startDraw(duration, speed){
    if(!participants.length){
        alert('참가자가 없습니다!');
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
            const p = Math.min(1, (now - slowStart) / 3000); // 감속에 걸리는시간, ms
            v = Math.min(maxV, speed) * (1 - p * p);         // ease‑out(quad)
        }else{
            const p = Math.min(1, elapsed / 1500); // 가속에 걸리는시간, ms
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
            await new Promise(resolve => setTimeout(resolve, 100));
            resultEl.classList.remove('hidden');
            resultEl.textContent = `🎉 당첨: ${sel.textContent}!`;
            // TODO: Play Sound
        };
        scrollingList.scrollTo({top: baseTarget, behavior: 'smooth'});
    }
}
const stopDraw = () => {
    modal.classList.add('hidden')
    animationId && cancelAnimationFrame(animationId)
}

drawBtn.addEventListener('click', () => startDraw(10000, 8));
document.onkeydown = e => e.key === 'Escape' && stopDraw();