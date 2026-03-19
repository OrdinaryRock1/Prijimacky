// 1. KONFIGURACE (Tyto údaje najdeš v nastavení Supabase projektu)
const SUPABASE_URL = 'https://oyxzqegasipfirzrdvad.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wMOu3zChuwl_cJycc0aUGw_uv8uB56G';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allQuestionsData = [];
let currentTest = [];
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 0; // v sekundách
let isTestActive = false;

// 2. NAČTENÍ DAT Z DATABÁZE
document.addEventListener('DOMContentLoaded', async () => {
    // Místo fetch() použijeme Supabase select
    const { data, error } = await db
        .from('questions')
        .select('*');

    if (error) {
        console.error("Chyba při načítání ze Supabase:", error);
    } else {
        // Zpracování dat
        allQuestionsData = data.map(row => {
            return {
                id: row.id,
                subject: row.subject,
                type: row.type,
                image_src: row.image_src, 
                context_image: row.context_image,
                points: row.points,
                ...row.data 
            };
        });

        // --- ZJISTÍME, NA JAKÉ JSME STRÁNCE ---
        // Pokud jsme na 'test.html', automaticky spustíme test podle URL
        if (window.location.pathname.includes('test.html')) {
            
            // Nastavíme tlačítko Finish (existuje jen na test.html)
            const finishBtn = document.getElementById('finish-btn');
            if (finishBtn) finishBtn.addEventListener('click', () => finishTest(false));

            const urlParams = new URLSearchParams(window.location.search);
            const runMode = urlParams.get('run');
            
            if (runMode) {
                currentSubject = urlParams.get('subject');
                const prefix = currentSubject === 'czech' ? 'c' : 'm';
                let pool = [];
                let count = 0;
                let timeLimit = 0;

                if (runMode === 'standard') {
                    timeLimit = currentSubject === 'czech' ? 60 : 70;
                    count = currentSubject === 'czech' ? 30 : 16;
                    pool = allQuestionsData.filter(q => q.id.startsWith(prefix));
                } 
                else if (runMode === 'specific') {
                    timeLimit = currentSubject === 'czech' ? 60 : 70;
                    const targetCode = urlParams.get('code');
                    pool = allQuestionsData.filter(q => q.id.startsWith(`${prefix}_`) && getTestCode(q.id) === targetCode);
                    count = pool.length;
                } 
                else if (runMode === 'practice') {
                    timeLimit = 0;
                    count = parseInt(urlParams.get('count')) || 15;
                    if (currentSubject === 'mix') {
                        pool = allQuestionsData;
                    } else {
                        pool = allQuestionsData.filter(q => q.id.startsWith(prefix));
                    }
                }

                // Spustíme test (funkci už nemusíme upravovat o skrývání headeru, protože na test.html header není)
                launchTestInterface(pool, count, timeLimit);
            }
        } 
        else {
            // --- JSME NA INDEX.HTML (Domovská stránka) ---
            // Zde nic nespouštíme automaticky. Čekáme na kliknutí uživatele.
        }
    }
});

// 2. INICIALIZACE TESTU (Volá se z menu)
let currentSubject = ""; // Pamatuje si, co uživatel vybral (czech/math)
// Pomocná funkce: z "c_2024_01_r_t1" udělá "2024_r_t1"
function getTestCode(id) {
    const parts = id.split('_');
    if (parts.length >= 5) {
        return `${parts[1]}_${parts[3]}_${parts[4]}`;
    }
    return null;
}
// Zobrazí menu pro daný předmět a vygeneruje seznam originálních testů
function showSubjectMenu(subject) {
    currentSubject = subject;
    
    // 1. Změna nadpisů podle předmětu
    document.getElementById('subject-title').innerText = subject === 'czech' ? "Český jazyk" : "Matematika";
    document.getElementById('standard-test-desc').innerText = 
        `Mix otázek ze všech roků (${subject === 'czech' ? '60' : '70'} min)`;

    // 2. Najdeme všechny unikátní originální testy pro vybraný předmět
    const prefix = subject === 'czech' ? 'c' : 'm';
    const subjectQuestions = allQuestionsData.filter(q => q.id.startsWith(prefix));
    
    // Extrahujeme kódy testů (Předpoklad ID: c_rok_cislo_termin_test -> např. c_2024_01_r_t1)
    const uniqueTests = new Set();
    subjectQuestions.forEach(q => {
        const parts = q.id.split('_');
        if (parts.length >= 5) {
            // Vytvoříme identifikátor testu (např. "2024_r_t1")
            const testCode = `${parts[1]}_${parts[3]}_${parts[4]}`;
            uniqueTests.add(testCode);
        }
    });

    // 3. Naplníme Select element
    const select = document.getElementById('specific-test-select');
    select.innerHTML = '<option value="random">Náhodný originální test</option>';
    
    Array.from(uniqueTests).sort().reverse().forEach(testCode => {
        // Převedeme "2024_r_t1" na lidský text "2024 - Řádný (T1)"
        const parts = testCode.split('_');
        const termName = parts[1] === 'r' ? "Řádný" : "Mimořádný";
        const label = `${parts[0]} - ${termName} (${parts[2].toUpperCase()})`;
        
        select.innerHTML += `<option value="${testCode}">${label}</option>`;
    });

    // 4. Nastavení tlačítek
    document.getElementById('btn-standard-test').onclick = () => startStandardTest();
    document.getElementById('btn-specific-test').onclick = () => startSpecificTest();
    document.getElementById('btn-custom-practice').onclick = () => startPractice();

    // Zobrazení sekce
    document.getElementById('subject-menu').classList.remove('hidden');
    // Scroll dolů na menu
    document.getElementById('subject-menu').scrollIntoView({ behavior: 'smooth' });
}

// Původně tam bylo 'index.html?run=...', teď dáme 'test.html?run=...'

function startStandardTest() {
    // Otevře test.html v nové záložce
    window.open(`test.html?run=standard&subject=${currentSubject}`, '_blank');
}

function startSpecificTest() {
    let selectVal = document.getElementById('specific-test-select').value;
    
    if (selectVal === 'random') {
        const options = Array.from(document.getElementById('specific-test-select').options)
                             .map(o => o.value)
                             .filter(v => v !== 'random');
        if (options.length === 0) return alert("Žádné testy k dispozici.");
        selectVal = options[Math.floor(Math.random() * options.length)];
    }
    window.open(`test.html?run=specific&subject=${currentSubject}&code=${selectVal}`, '_blank');
}

function startPractice(overrideSubject = null) {
    const subjectToUse = overrideSubject || currentSubject;
    let count = 20;
    if (subjectToUse !== 'mix') {
        // Tady pozor: element custom-count existuje jen na index.html
        // Pokud funkci voláme, musíme ověřit, jestli element existuje
        const inputEl = document.getElementById('custom-count');
        if (inputEl) {
            count = parseInt(inputEl.value) || 15;
        }
    }
    window.open(`test.html?run=practice&subject=${subjectToUse}&count=${count}`, '_blank');
}
// Samotné spuštění testu (nahrazuje původní vnitřek initTest)
// Samotné spuštění testu
// Samotné spuštění testu
function launchTestInterface(questionPool, count, timeLimitMinutes) {
    if (questionPool.length === 0) {
        alert("Nenalezeny žádné otázky pro tento výběr.");
        return;
    }

    const shuffled = questionPool.sort(() => 0.5 - Math.random());
    currentTest = shuffled.slice(0, Math.min(count, shuffled.length));

    // UI pro test (na test.html je to vidět defaultně, ale pro jistotu)
    const testInterface = document.getElementById('test-interface');
    if (testInterface) testInterface.classList.remove('hidden');
    
    renderQuestionsDOM();
    renderNavigation();
    showQuestion(0);
    
    if (timeLimitMinutes > 0) {
        startTimer(timeLimitMinutes * 60);
    } else {
        const timerEl = document.getElementById('timer');
        if(timerEl) timerEl.innerText = "∞"; 
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

function finishTest(timeRanOut = false) {
    if (!isTestActive) return;
    
    isTestActive = false;
    clearInterval(timerInterval);

    let totalScore = 0;
    let maxPoints = 0;

    // Projdeme všechny otázky
    currentTest.forEach((q, index) => {
        try {
            const card = document.querySelector(`.question-card[data-index="${index}"]`);
            if (!card) return;

            // --- 1. VYPOČET BODŮ A TEXTU ---
            let points = 0;
            let answerText = ""; // Tady budeme skládat text odpovědi
            const subject = q.subject;

            // >>> ČESKÝ JAZYK <<<
            if (subject === 'czech') {
                if (q.type === 'abcd') {
                    const selected = card.querySelector(`input[name="q_${q.id}"]:checked`);
                    if (selected && selected.value === q.correct_answer) points = 1;
                    answerText = `Správná odpověď: <strong>${q.correct_answer}</strong>`;
                }
                else if (q.type === 'true_false_group') {
                    let correctCount = 0;
                    let correctPairs = [];
                    q.sub_questions.forEach(sub => {
                        const checked = card.querySelector(`input[name="q_${q.id}_${sub.label}"]:checked`);
                        const userVal = checked ? checked.value : null; 
                        const correctVal = sub.correct ? "ANO" : "NE";
                        if (userVal === correctVal) correctCount++;
                        correctPairs.push(`${sub.label}: ${correctVal}`);
                    });
                    if (correctCount === 4) points = 2;
                    else if (correctCount === 3) points = 1;
                    answerText = `Správně: ${correctPairs.join(", ")}`;
                }
                else if (q.type === 'group_abcd') {
                    let correctPairs = [];
                    q.sub_questions.forEach(sub => {
                        const checked = card.querySelector(`input[name="q_${q.id}_${sub.label}"]:checked`);
                        if (checked && checked.value === sub.correct_answer) points += 1;
                        correctPairs.push(`${sub.label}-${sub.correct_answer}`);
                    });
                    answerText = `Správně: ${correctPairs.join(", ")}`;
                }
                else if (q.type === 'ordering') {
                    const list = card.querySelector('.sortable-list');
                    if (list) {
                        const items = list.querySelectorAll('.draggable-item');
                        let userOrder = [];
                        items.forEach(item => userOrder.push(item.dataset.value));
                        if (JSON.stringify(userOrder) === JSON.stringify(q.correct_answer)) points = 3;
                    }
                    answerText = `Správné pořadí: <strong>${q.correct_answer.join(" - ")}</strong>`;
                }
                else if (q.type === 'open') {
                    const input = card.querySelector(`input[name="q_${q.id}"]`);
                    let correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
                    answerText = `Možné odpovědi: <strong>${correctArr.join(" nebo ")}</strong>`; // TEXT PRO VÝPIS

                    if (input) {
                        const maxP = q.points || 1;
                        let currentP = maxP;
                        let normCorrect = correctArr.map(w => w.toString().toLowerCase().trim());
                        let userVal = input.value.trim().toLowerCase();
                        let userArr = userVal.split(/[\s,]+/).filter(w => w.length > 0);
                        let missing = 0;
                        let extra = 0;
                        normCorrect.forEach(w => { if (!userArr.includes(w)) missing++; });
                        userArr.forEach(w => { if (!normCorrect.includes(w)) extra++; });
                        points = currentP - (missing + extra);
                        if (points < 0) points = 0;
                    }
                }
                else if (q.type === 'multi_open') {
                     let solutions = [];
                     q.sub_questions.forEach(sub => {
                        const inp = card.querySelector(`input[name="q_${q.id}_${sub.label}"]`);
                        let correctArr = Array.isArray(sub.correct_answer) ? sub.correct_answer : [sub.correct_answer];
                        solutions.push(`${sub.label}: ${correctArr.join("/")}`);
                        if(inp) {
                            const userVal = inp.value.trim().toLowerCase();
                            if (correctArr.some(ans => ans.toString().toLowerCase() === userVal)) points += 1;
                        }
                     });
                     answerText = `Správně: ${solutions.join(", ")}`;
                }
            }
            // >>> MATEMATIKA <<<
            else if (subject === 'math') {
                if (q.type === 'open') {
                    const input = card.querySelector(`input[name="q_${q.id}"]`);
                    let correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
                    answerText = `Správně: <strong>${correctArr.join(" nebo ")}</strong>`; // TEXT PRO VÝPIS

                    if (input) {
                        const userVal = input.value.trim().replace(',', '.');
                        if (correctArr.some(ans => ans.toString().replace(',', '.') === userVal)) points = q.points || 1;
                    }
                }
                else if (q.type === 'multi_open') {
                    let solutions = [];
                    q.sub_questions.forEach(sub => {
                        const inp = card.querySelector(`input[name="q_${q.id}_${sub.label}"]`);
                        let correctArr = Array.isArray(sub.correct_answer) ? sub.correct_answer : [sub.correct_answer];
                        solutions.push(`${sub.label}: ${correctArr.join("/")}`); // Přidáme do řešení
                        if(inp) {
                            const userVal = inp.value.trim().replace(',', '.');
                            if (correctArr.some(ans => ans.toString().replace(',', '.') === userVal)) points += 1;
                        }
                     });
                     answerText = `Správně: ${solutions.join(", ")}`;
                }
                else if (q.type === 'group_abcd') {
                    let correctPairs = [];
                    q.sub_questions.forEach(sub => {
                        const checked = card.querySelector(`input[name="q_${q.id}_${sub.label}"]:checked`);
                        if (checked && checked.value === sub.correct_answer) points += 2;
                        correctPairs.push(`${sub.label}-${sub.correct_answer}`);
                    });
                    if (q.points && points > q.points) points = q.points;
                    answerText = `Správně: ${correctPairs.join(", ")}`;
                }
                else if (q.type === 'true_false_group') {
                    let correctCount = 0;
                    let correctPairs = [];
                    q.sub_questions.forEach(sub => {
                        const checked = card.querySelector(`input[name="q_${q.id}_${sub.label}"]:checked`);
                        const userVal = checked ? checked.value : null; 
                        const correctVal = sub.correct ? "ANO" : "NE";
                        if (userVal === correctVal) correctCount++;
                        correctPairs.push(`${sub.label}: ${correctVal}`);
                    });
                    if (correctCount === 3) points = 2;
                    else if (correctCount === 2) points = 1;
                    answerText = `Správně: ${correctPairs.join(", ")}`;
                }
                else if (q.type === 'abcd') {
                    const selected = card.querySelector(`input[name="q_${q.id}"]:checked`);
                    if (selected && selected.value === q.correct_answer) points = q.points || 2;
                    answerText = `Správná odpověď: <strong>${q.correct_answer}</strong>`;
                }
            }

            // --- 2. VIZUALIZACE ---
            totalScore += points;

            // Výpočet maxima bodů pro otázku
            let questionMax = q.points || 1;
            if (q.type === 'true_false_group' && subject === 'czech') questionMax = 2;
            if (q.type === 'true_false_group' && subject === 'math') questionMax = 2;
            if (q.type === 'ordering') questionMax = 3;
            if (subject === 'math' && q.type === 'group_abcd') questionMax = Math.min(6, q.sub_questions.length * 2);
            if (subject === 'math' && q.type === 'abcd') questionMax = 2;

            maxPoints += questionMax;

            // Najdeme nebo vytvoříme feedback div
            let fbEl = card.querySelector('.feedback');
            if (!fbEl) {
                fbEl = document.createElement('div');
                fbEl.className = 'feedback';
                card.appendChild(fbEl);
            }

            // VÝPIS VÝSLEDKU A ODPOVĚDI
            if (points === questionMax) {
                // ZELENÁ - Vše správně
                card.style.border = "2px solid #06d6a0"; 
                // I když je to správně, můžeme zobrazit potvrzení, co byla správná odpověď (volitelné)
                fbEl.innerHTML = `<span style='color:#06d6a0; font-weight:bold'>Výborně! (+${points} b)</span>`;
            } 
            else if (points > 0) {
                // ORANŽOVÁ - Částečně
                card.style.border = "2px solid orange"; 
                fbEl.innerHTML = `
                    <span style='color:orange; font-weight:bold'>Částečně správně (+${points} b)</span><br>
                    <div style='margin-top:5px; color:#bbb; font-size:0.9em; border-top:1px solid #444; padding-top:5px;'>
                        ${answerText}
                    </div>
                `;
            } 
            else {
                // ČERVENÁ - Chyba
                card.style.border = "2px solid #ef476f"; 
                fbEl.innerHTML = `
                    <span style='color:#ef476f; font-weight:bold'>Chyba (0 b)</span><br>
                    <div style='margin-top:5px; color:#bbb; font-size:0.9em; border-top:1px solid #444; padding-top:5px;'>
                        ${answerText}
                    </div>
                `;
            }

        } catch (err) {
            console.error(`Chyba u otázky ${index}:`, err);
        }
    });

    const msg = timeRanOut ? "Čas vypršel! " : "";
    const scoreText = document.getElementById('score-text');
    if (scoreText) scoreText.innerText = `${msg}Tvé skóre: ${totalScore} / ${maxPoints}`;
    
    document.getElementById('result-modal').classList.remove('hidden');
    document.getElementById('finish-btn').style.display = 'none';
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

