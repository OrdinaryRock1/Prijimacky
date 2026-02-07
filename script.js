let allQuestionsData = [];
let currentTest = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 0; // v sekundách
let isTestActive = false;

// 1. NAČTENÍ DAT
document.addEventListener('DOMContentLoaded', () => {
    fetch('questions.json')
        .then(response => response.json())
        .then(data => {
            allQuestionsData = data;
        })
        .catch(err => console.error("Chyba JSON:", err));

    document.getElementById('finish-btn').addEventListener('click', finishTest);
});

// 2. INICIALIZACE TESTU (Volá se z menu)
function initTest(mode) {
    let questionsPool = [];
    let timeLimitMinutes = 0;
    let questionCount = 0;

    // Filtrování otázek podle ID (předpoklad: c_... = čeština, m_... = matika)
    if (mode === 'math') {
        questionsPool = allQuestionsData.filter(q => q.id.startsWith('m'));
        timeLimitMinutes = 70;
        questionCount = 16;
    } else if (mode === 'czech') {
        questionsPool = allQuestionsData.filter(q => q.id.startsWith('c'));
        timeLimitMinutes = 60;
        questionCount = 30;
    } else {
        // Mix - bez limitu, náhodný mix všeho
        questionsPool = allQuestionsData;
        timeLimitMinutes = 0; // Bez limitu
        questionCount = 20; // Například 20 náhodných
    }

    // Pokud nemáme dost otázek, vezmeme všechny dostupné
    if (questionsPool.length === 0) {
        alert("Chyba: Žádné otázky pro vybraný předmět nenalezeny. Zkontroluj ID v JSONu (musí začínat na 'c_' nebo 'm_').");
        return;
    }

    // Náhodný výběr
    const shuffled = questionsPool.sort(() => 0.5 - Math.random());
    currentTest = shuffled.slice(0, questionCount);

    // Příprava UI
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('test-interface').classList.remove('hidden');
    
    // Spuštění
    renderQuestionsDOM();
    renderNavigation();
    showQuestion(0);
    
    if (timeLimitMinutes > 0) {
        startTimer(timeLimitMinutes * 60);
    } else {
        document.getElementById('timer').innerText = "∞";
    }
    
    isTestActive = true;
}

// 3. VYTVOŘENÍ DOM PRO VŠECHNY OTÁZKY (Všechny se vloží, ale skryjí)
function renderQuestionsDOM() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';

    currentTest.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card'; 
        card.dataset.index = index;
        card.dataset.id = q.id;
        card.dataset.type = q.type;

        let htmlContent = `<h3>Otázka ${index + 1}</h3>`;
        
        if (q.context_image) {
            htmlContent += `<img src="${q.context_image}" class="context-image" alt="Text">`;
        }
        htmlContent += `<img src="${q.image_src}" alt="Otázka">`;
        htmlContent += `<div class="answers">`;

        // --- 1. ABCD ---
        if (q.type === 'abcd') {
            ['A', 'B', 'C', 'D', 'E'].forEach(opt => {
                htmlContent += `<label><input type="radio" name="q_${q.id}" value="${opt}" onchange="markAnswered(${index})"> ${opt}</label>`;
            });
        } 
        // --- 2. OPEN (Otevřená) ---
        else if (q.type === 'open') {
            htmlContent += `<input type="text" name="q_${q.id}" oninput="markAnswered(${index})">`;
        }
        // --- 3. TRUE/FALSE GROUP (Ano/Ne) ---
        else if (q.type === 'true_false_group') {
            q.sub_questions.forEach(sub => {
                htmlContent += `<div class="sub-question">
                    <span>${sub.label}: </span>
                    <label><input type="radio" name="q_${q.id}_${sub.label}" value="ANO" onchange="markAnswered(${index})"> ANO</label>
                    <label><input type="radio" name="q_${q.id}_${sub.label}" value="NE" onchange="markAnswered(${index})"> NE</label>
                </div>`;
            });
        }
        // --- 4. GROUP ABCD (Přiřazování) ---
        else if (q.type === 'group_abcd') {
             const options = q.options || ['A', 'B', 'C', 'D', 'E', 'F'];
             q.sub_questions.forEach(sub => {
                htmlContent += `<div class="sub-question"><strong>${sub.label}:</strong> `;
                options.forEach(opt => {
                    htmlContent += `<label><input type="radio" name="q_${q.id}_${sub.label}" value="${opt}" onchange="markAnswered(${index})"> ${opt}</label>`;
                });
                htmlContent += `</div>`;
             });
        }
        // --- 5. MULTI OPEN (Podúlohy s textem) - TOTO TI CHYBĚLO ---
        else if (q.type === 'multi_open') {
            q.sub_questions.forEach(sub => {
                htmlContent += `
                    <div class="sub-question" data-sub="${sub.label}">
                        <span>${sub.label}: </span>
                        <input type="text" name="q_${q.id}_${sub.label}" oninput="markAnswered(${index})">
                    </div>`;
            });
        }
        // --- 6. ORDERING (Seřazování) - TOTO TI TAKÉ CHYBĚLO ---
        else if (q.type === 'ordering') {
             htmlContent += `<ul class="sortable-list" data-qid="${q.id}">`;
             // Zobrazíme seřazené A, B, C...
             const items = [...q.correct_answer].sort(); 
             items.forEach(val => {
                 htmlContent += `<li class="draggable-item" draggable="true" data-value="${val}">${val}</li>`;
             });
             htmlContent += `</ul><p style="font-size:0.8em; color:gray;">(Seřazování zatím funguje jen vizuálně, Drag&Drop logika se přidává v event listenerech)</p>`;
             // Poznámka: Plná Drag&Drop logika vyžaduje připojení event listenerů po vložení do DOMu, 
             // pro jednoduchost zde jen vykreslíme HTML.
        }

        htmlContent += `</div><div class="feedback"></div>`;
        card.innerHTML = htmlContent;
        container.appendChild(card);
        
        // Pokud je to ordering, musíme přidat Listenery až teď (protože už existují v DOMu)
        if (q.type === 'ordering') {
            setupDragAndDrop(card); // Zavoláme pomocnou funkci
        }
    });
}

// 4. NAVIGACE A STRÁNKOVÁNÍ
function renderNavigation() {
    const navGrid = document.getElementById('navigation-grid');
    navGrid.innerHTML = '';
    
    currentTest.forEach((_, index) => {
        const btn = document.createElement('div');
        btn.className = 'nav-item';
        btn.innerText = index + 1;
        btn.onclick = () => showQuestion(index);
        btn.id = `nav-${index}`;
        navGrid.appendChild(btn);
    });
}

function showQuestion(index) {
    // Schovat všechny karty
    document.querySelectorAll('.question-card').forEach(c => c.classList.remove('active-card'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Zobrazit vybranou kartu
    const cards = document.querySelectorAll('.question-card');
    if (cards[index]) {
        cards[index].classList.add('active-card');
        currentQuestionIndex = index;
    }

    // Aktualizovat navigaci (čísla nahoře)
    const navItem = document.getElementById(`nav-${index}`);
    if (navItem) navItem.classList.add('active');

    // --- OVLÁDÁNÍ TLAČÍTEK ---
    
    // Tlačítko PŘEDCHOZÍ: Vypnuté na první otázce
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.disabled = (index === 0);
    
    // Tlačítko DALŠÍ: 
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        // Pokud jsme na poslední otázce, tlačítko "Další" skryjeme nebo vypneme
        if (index === currentTest.length - 1) {
            nextBtn.style.visibility = 'hidden'; // Skryjeme ho, aby nezabíralo místo (nebo disabled = true)
        } else {
            nextBtn.style.visibility = 'visible';
            nextBtn.disabled = false;
            nextBtn.innerText = "Další →";
            nextBtn.onclick = () => changeQuestion(1);
        }
    }
}

function changeQuestion(offset) {
    const newIndex = currentQuestionIndex + offset;
    if (newIndex >= 0 && newIndex < currentTest.length) {
        showQuestion(newIndex);
    }
}

function markAnswered(index) {
    // Označí čtvereček v navigaci jako "vyplněný"
    const navItem = document.getElementById(`nav-${index}`);
    if (navItem) navItem.classList.add('answered');
}

// 5. ČASOVAČ
function startTimer(seconds) {
    timeLeft = seconds;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishTest(true); // true = vypršel čas
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('timer').innerText = 
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    // Varování posledních 5 minut
    if (timeLeft < 300) {
        document.getElementById('timer').style.color = '#ef476f';
    }
}

// 6. VYHODNOCENÍ
function finishTest(timeRanOut = false) {
    if (!isTestActive) return;
    
    isTestActive = false;
    clearInterval(timerInterval);

    let score = 0;
    let totalPoints = 0;

    // Projdeme otázky jednu po druhé
    currentTest.forEach((q, index) => {
        // --- ZÁCHRANNÝ BLOK (TRY-CATCH) ---
        // Pokud nastane chyba u jedné otázky, program nespadne, ale pokračuje dál.
        try {
            const card = document.querySelector(`.question-card[data-index="${index}"]`);
            
            if (!card) {
                console.warn(`Otázka ${index} nebyla nalezena v DOMu.`);
                return; // Přeskočit tuto iteraci
            }

            // Vytvoření feedback divu, pokud chybí
            let fbEl = card.querySelector('.feedback');
            if (!fbEl) {
                fbEl = document.createElement('div');
                fbEl.className = 'feedback';
                card.appendChild(fbEl);
            }

            let isCorrect = false;
            let correctAnswerText = "";

            // --- 1. ABCD ---
            if (q.type === 'abcd') {
                const selected = card.querySelector(`input[name="q_${q.id}"]:checked`);
                const userVal = selected ? selected.value : null;
                if (userVal === q.correct_answer) isCorrect = true;
                correctAnswerText = `Správně: ${q.correct_answer}`;
            }
            
            // --- 2. OPEN (Otevřená) ---
            else if (q.type === 'open') {
                const input = card.querySelector(`input[name="q_${q.id}"]`);
                if (input) {
                    const userVal = input.value.trim();
                    const correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
                    if (correctArr.some(ans => ans.toString().toLowerCase() === userVal.toLowerCase())) {
                        isCorrect = true;
                    }
                    correctAnswerText = `Správně: ${correctArr.join(" nebo ")}`;
                }
            }

            // --- 3. ORDERING ---
            else if (q.type === 'ordering') {
                const list = card.querySelector('.sortable-list');
                if (list) {
                    const items = list.querySelectorAll('.draggable-item');
                    let userOrder = [];
                    items.forEach(item => userOrder.push(item.dataset.value));

                    if (JSON.stringify(userOrder) === JSON.stringify(q.correct_answer)) {
                        isCorrect = true;
                        items.forEach(i => i.classList.add('correct-order'));
                    } else {
                        items.forEach(i => i.classList.add('wrong-order'));
                    }
                    correctAnswerText = `Správné pořadí: ${q.correct_answer.join(" - ")}`;
                }
            }

            // --- 4. SKUPINY (Group ABCD, True/False, Multi Open) ---
            else if (q.type === 'group_abcd' || q.type === 'true_false_group' || q.type === 'multi_open') {
                let subCorrectCount = 0;
                let subTotal = 0;
                let subFeedback = [];

                if (q.sub_questions) {
                    q.sub_questions.forEach(sub => {
                        subTotal++;
                        const subDiv = card.querySelector(`.sub-question[data-sub="${sub.label}"]`);
                        
                        // Pokud podotázka v HTML chybí, přeskočíme ji (nepočítáme ji)
                        if (!subDiv) return;

                        let userVal = "";
                        let correctVal = "";
                        let subIsCorrect = false;

                        // Získání hodnot
                        if (q.type === 'multi_open') {
                            const inp = subDiv.querySelector('input');
                            userVal = inp ? inp.value.trim() : "";
                            const correctArr = Array.isArray(sub.correct_answer) ? sub.correct_answer : [sub.correct_answer];
                            correctVal = correctArr.join(" nebo ");
                            if (correctArr.some(ans => ans.toString().toLowerCase() === userVal.toLowerCase())) subIsCorrect = true;
                        } 
                        else if (q.type === 'true_false_group') {
                            const checked = subDiv.querySelector(`input:checked`);
                            userVal = checked ? checked.value : null;
                            const expectedString = sub.correct ? "ANO" : "NE";
                            correctVal = expectedString;
                            if (userVal === expectedString) subIsCorrect = true;
                        } 
                        else { // group_abcd
                            const checked = subDiv.querySelector(`input:checked`);
                            userVal = checked ? checked.value : null;
                            correctVal = sub.correct_answer;
                            if (userVal === correctVal) subIsCorrect = true;
                        }

                        // Obarvení řádku
                        if (subIsCorrect) {
                            subDiv.classList.add('correct');
                            subCorrectCount++;
                        } else {
                            subDiv.classList.add('incorrect');
                            subFeedback.push(`${sub.label}: ${correctVal}`);
                        }
                    });
                }
                
                // Bodujeme jen pokud je vše dobře
                if (subTotal > 0 && subCorrectCount === subTotal) isCorrect = true;
                correctAnswerText = subFeedback.length > 0 ? "Chyby: " + subFeedback.join(", ") : "Vše správně";
            }

            // --- OBARVENÍ KARTY (OUTLINE) ---
            if (isCorrect) {
                score++;
                card.style.border = "2px solid #06d6a0"; // Zelená
                fbEl.innerHTML = "<span style='color:#06d6a0; font-weight:bold'>Správně!</span>";
            } else {
                card.style.border = "2px solid #ef476f"; // Červená
                fbEl.innerHTML = `<span style='color:#ef476f; font-weight:bold'>Chyba.</span> <br> ${correctAnswerText}`;
            }

        } catch (err) {
            // ZDE JE TA MAGIE: Pokud to spadne, vypíše chybu do konzole, ale NEZASTAVÍ program
            console.error(`Chyba při vyhodnocování otázky ID ${q.id}:`, err);
            // I chybné otázce dáme červený rámeček, abychom věděli, že se zpracovala
            const card = document.querySelector(`.question-card[data-index="${index}"]`);
            if (card) card.style.border = "2px dashed orange"; 
        }

        totalPoints += q.points || 1; 
    });

    // Zobrazení Modalu
    const msg = timeRanOut ? "Čas vypršel! " : "";
    const scoreText = document.getElementById('score-text');
    const modal = document.getElementById('result-modal');
    const finishBtn = document.getElementById('finish-btn');

    if (scoreText) scoreText.innerText = `${msg}Tvé skóre: ${score} / ${totalPoints}`;
    
    // Zobrazení modalu
    if (modal) {
        modal.classList.remove('hidden');
        // Ujistíme se, že tlačítka uvnitř jsou vidět (pro případ, že by byla skrytá)
        const actions = modal.querySelector('.modal-actions');
        if(actions) actions.style.display = 'flex'; 
    }

    if (finishBtn) finishBtn.style.display = 'none';
    const exitReviewBtn = document.getElementById('exit-review-btn');
    if (exitReviewBtn) exitReviewBtn.classList.remove('hidden');
}

function reviewMistakes() {
    document.getElementById('result-modal').classList.add('hidden');
    // Uživatel nyní může procházet otázky a vidí červené/zelené orámování (to zajistí funkce vyhodnocení, která přidává třídy)
    // Umožníme navigaci
    showQuestion(0);
}
function setupDragAndDrop(card) {
    const list = card.querySelector('.sortable-list');
    if (!list) return;
    
    const items = list.querySelectorAll('.draggable-item');
    items.forEach(item => {
        item.addEventListener('dragstart', () => item.classList.add('dragging'));
        item.addEventListener('dragend', () => item.classList.remove('dragging'));
    });

    list.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(list, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            list.appendChild(draggable);
        } else {
            list.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}