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
    countEl.textContent = participants.length;
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
    closeBtn.onclick = () => {
        cancelAnimationFrame(rafId);
        modal.classList.add('hidden');
    };

    const itemHeight = scrollingList.querySelector('li').getBoundingClientRect().height;
    const randomIndex = participants.length + Math.floor(Math.random() * participants.length)
    const baseTarget = scrollingList.children[randomIndex].offsetTop - (scrollingList.clientHeight / 2 - itemHeight / 2);
    scrollingList.scrollTo({top: baseTarget});

    const t0 = performance.now();
    let v = 0.1;            // px/frame
    let prevIndex = null;       // 실시간 강조용
    let slowStart = null;
    let stopTriggered = false;

    let rafId = requestAnimationFrame(step);
    const maxScroll = scrollingList.scrollHeight - scrollingList.clientHeight - itemHeight;

    function step(now){
        const elapsed = now - t0;

        elapsed >= duration && (stopTriggered = true); // 자동 종료 예약
        if(stopTriggered){
            if(slowStart === null){
                slowStart = now;
                stopBtn.disabled = true;
            }
            const p = Math.min(1, (now - slowStart) / 3000); // 감속에 걸리는시간, ms
            v = speed * (1 - p * p);                         // ease‑out(quad)
        }else{
            const p = Math.min(1, elapsed / 1500); // 가속에 걸리는시간, ms
            v = speed * (p * p);                   // ease‑in(quad)
        }

        /* 3️⃣ 스크롤 */
        scrollingList.scrollTop += v;
        // 리스트 맨 끝 근처에 오면 ▶️ 한 세트(원본 길이)만큼 되돌려
        if(scrollingList.scrollTop >= maxScroll){
            scrollingList.scrollTop -= itemHeight * participants.length * 15; // 동일 내용 유지
        }

        /* 4️⃣ 중앙 강조 */
        highlightCenter();
        if(stopTriggered && v < 0.15){
            alignAndFinish();
        }else{
            rafId = requestAnimationFrame(step);
        }
    }

    /* 현재 중앙 항목 하이라이트 */
    function highlightCenter(){
        const centerLine = scrollingList.scrollTop + scrollingList.clientHeight / 2;
        const children = scrollingList.children;

        let index = -1;
        for(let i = 0; i < children.length; i++){
            const start = children[i].offsetTop;
            const end = start + itemHeight;
            if(start <= centerLine && centerLine <= end){
                index = i;
                break;
            }
        }

        if(index === -1) alert('hi')

        // 선택 상태 갱신
        if(index !== -1 && prevIndex !== index){
            children[index].classList.add('selected');
            children[prevIndex]?.classList.remove('selected');
            prevIndex = index;
        }
    }

    /* 가장 인접한 항목으로 이동 */
    function alignAndFinish(){
        const sel = scrollingList.children[prevIndex]
        const baseTarget = sel.offsetTop - (scrollingList.clientHeight / 2 - itemHeight / 2);
        scrollingList.scrollTo({top: baseTarget, behavior: 'smooth'});
        scrollingList.onscrollend = async () => {
            scrollingList.onscrollend = null
            await new Promise(resolve => setTimeout(resolve, 100));
            resultEl.classList.remove('hidden');
            resultEl.textContent = `🎉 당첨: ${sel.textContent}!`;
        };
    }
}
drawBtn.addEventListener('click', () => startDraw(10000, 8));

/* --------------------------------------------------------
 * 모달 스크롤 리스트 구성
 * ------------------------------------------------------*/
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