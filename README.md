# Dokumentace k projektu: TestniTo

**Název práce:** TestniTo
**Jméno a příjmení:** Trung Hai Hoang
**Studijní obor:** Informační technologie
**Školní rok:** 2025/2026

---

## 1. Anotace
Tato práce se zabývá návrhem a vývojem interaktivní webové aplikace „TestniTo“, která slouží žákům 9. tříd k efektivní přípravě na jednotné přijímací zkoušky (JPZ) z českého jazyka a matematiky. Aplikace využívá reálná data z minulých ročníků zkoušek Cermat. Je postavena na moderních webových technologiích (HTML5, CSS3, Vanilla JavaScript) a jako backend využívá cloudovou databázi Supabase. Nabízí simulaci reálných testů na čas, automatické a detailní vyhodnocení včetně částečného bodování složitějších úloh a moderní uživatelské rozhraní optimalizované i pro mobilní zařízení.

---

## 2. Úvod
Přechod ze základní na střední školu je pro většinu žáků devátých ročníků prvním velkým akademickým stresem. Jednotné přijímací zkoušky (JPZ) organizované agenturou Cermat mají svá pevná pravidla, striktní časové limity a především velmi specifickou typologii úloh. Znalost samotného učiva často nestačí; žák musí být schopen rychle se orientovat v zadání, efektivně pracovat s časem a pochopit logiku, jakou jsou otázky konstruovány (např. přiřazovací úlohy, svazky otázek typu Ano/Ne, seřazování textu atd.). 

Současné možnosti přípravy mají své limity. Oficiální testy od Cermatu jsou sice volně dostupné ve formátu PDF, ale jejich řešení vyžaduje tisk, manuální měření času a následnou zdlouhavou kontrolu podle klíče správných řešení, což je proces neintuitivní a demotivující. Na trhu existuje řada komerčních platforem a přípravných kurzů, ty jsou však často velmi nákladné a ne každý rodič si je může pro své dítě dovolit. To vytváří nerovné podmínky v přístupu ke vzdělání. 

Cílem projektu „TestniTo“ je tento problém vyřešit vytvořením bezplatného, bleskově rychlého a maximálně přístupného nástroje, který přesně simuluje prostředí reálné zkoušky. Aplikace odstraňuje tření spojené s papírovými testy – čas se měří automaticky, průchod testem je interaktivní a co je nejdůležitější, vyhodnocení proběhne okamžitě po odevzdání. Žák okamžitě vidí, kde udělal chybu, získá informaci o správném řešení a díky modernímu zpracování (včetně „Dark mode“ designu) je pro něj učení méně vyčerpávající. Rozdělení aplikace na část pro procvičování a část pro ostrou simulaci dává uživatelům svobodu zvolit si tempo, jaké jim v danou chvíli vyhovuje.

---

## 3. Ekonomická rozvaha

### Konkurence a naše výhody
* **Tradiční konkurence:** Oficiální PDF od Cermatu, placené kurzy (např. Zkoušky nanečisto, ToDáš), tištěné cvičebnice (Taktik, Didaktis).
* **V čem je TestniTo lepší:** * **Je zdarma a ihned dostupné:** Nevyžaduje registraci ani platbu, stačí otevřít v prohlížeči.
    * **Automatizace:** Okamžitě počítá body (včetně komplexního hodnocení za částečně správné odpovědi, přesně podle metodiky Cermat).
    * **UX/UI:** Oproti těžkopádným vzdělávacím systémům má TestniTo moderní vzhled, je responzivní (lze procvičovat na mobilu cestou do školy) a obsahuje gamifikační prvky (okamžitá vizuální zpětná vazba, barevné rozlišení chyb).

### Způsob propagace
Cílovou skupinou jsou primárně žáci 8. a 9. tříd (14–15 let) a jejich rodiče. 
1.  **Sociální sítě:** Tvorba organického obsahu na TikTok a Instagram Reels (tipy na chytáky v přijímačkách s odkazem na vyzkoušení v aplikaci). Oslovování tvůrců zaměřených na vzdělávání (tzv. *studygrams*).
2.  **SEO (Optimalizace pro vyhledávače):** Cílení na klíčová slova typu „cermat testy online“, „přijímačky nanečisto čeština“, „výpočet bodů cermat“.

### Návratnost investic (ROI)
Projekt je v současné fázi koncipován jako nízkonákladový (neziskový/portfolio projekt). 
* **Náklady:** Téměř nulové. Provoz databáze běží na bezplatném tieru služby Supabase, hosting frontendu lze řešit přes free služby jako GitHub Pages nebo Vercel. Jediným nákladem je případný nákup domény (cca 200 Kč / rok) a čas strávený vývojem.
* **Monetizace (do budoucna):** Pokud by projekt získal velkou trakci, lze nasadit nenásilnou bannerovou reklamu nebo vytvořit prémiový účet (např. 99 Kč/měsíc) odemykající detailní statistiky postupu, historii testů nebo AI tutora pro vysvětlení chyb (propojení např. s OpenAI API).

---

## 4. Vývoj a použité technologie

### Použité technologie
* **Frontend:** HTML5, CSS3 (využití CSS proměnných pro snadnou změnu témat, Flexbox/Grid pro responzivitu).
* **Logika (Skriptování):** Vanilla JavaScript (ES6+). Projekt záměrně nepoužívá těžké frameworky (React/Vue) pro zachování maximální rychlosti načítání a jednoduchosti kódu.
* **Backend a Databáze:** **Supabase** (open-source alternativa k Firebase). Poskytuje PostgreSQL databázi a API přes knihovnu `supabase-js`.

### Architektura a členění programu
Aplikace je rozdělena na dvě hlavní stránky, aby nedocházelo k míchání logiky menu a testovacího prostředí:
1.  `index.html`: Obsahuje úvodní obrazovku (Hero sekci), návod a dynamicky generované menu pro výběr testů.
2.  `test.html`: Izolované prostředí samotného testu s časovačem a plovoucím navigačním panelem.
3.  `styles.css`: Centralizovaný stylopis sdílený oběma stránkami.
4.  `script.js`: Obsahuje veškerou aplikační logiku.

### Průběh vývoje a vnitřní logika
1.  **Návrh datového modelu:** Vývoj začal v Supabase vytvořením tabulky `questions`. Nejsložitějším krokem bylo vymyslet jednotnou strukturu JSON dat pro 6 různých typů otázek (klasické ABCD, otevřené, Ano/Ne bloky, přiřazovací úlohy, vícečetné otevřené úlohy a seřazování).
2.  **Routování bez backendu:** Přechod mezi indexem a testem je řešen chytře pomocí URL parametrů (`?run=standard&subject=czech`). JavaScript na `test.html` si tyto parametry přečte a podle nich z databáze namíchá pool otázek.
3.  **Dynamický DOM:** Funkce `renderQuestionsDOM()` je jádrem aplikace. Iteruje přes vybrané otázky a na základě atributu `type` generuje příslušné HTML inputy (radio buttony, textová pole, drag&drop seznamy).
4.  **Vyhodnocovací algoritmus:** Funkce `finishTest()` obsahuje komplexní logiku pro parsování odpovědí. Obsahuje algoritmy pro toleranci překlepů (převod na malá písmena, ignorování mezer), nahrazování desetinných čárek v matematice a výpočet částečných bodů (např. 2 body za 4 správné Ano/Ne, 1 bod za 3 správné).
5.  **Interaktivita:** Byla implementována nativní HTML5 Drag & Drop funkcionalita pro úlohy typu "seřazování textu" s vizuální indikací (přerušovaný rámeček při tažení).

---

## 5. Testování

* **Scénář 1: Nasazení aplikace a inicializace databáze (Smoke test)**
    * *Postup:* Nasazení souborů na lokální/vzdálený server a otevření v čistém prohlížeči.
    * *Očekávaný výsledek:* Stránka se načte bez chyb v konzoli, napojí se na Supabase a po kliknutí na "Vybrat originální test" dynamicky vygeneruje dropdown menu testů z DB.
    * *Skutečný výsledek:* **Úspěch**. Data se stahují asynchronně, aplikace běží plynule.
* **Scénář 2: Algoritmus vyhodnocení částečných bodů (Český jazyk - Ano/Ne)**
    * *Postup:* V testu se 4 podotázkami Ano/Ne uživatel schválně zodpoví 3 správně a 1 špatně. Následně odevzdá test.
    * *Očekávaný výsledek:* Algoritmus rozpozná 3 správné shody, přidělí 1 bod (místo maximálních 2) a kartu označí oranžovým orámováním (částečně správně). Vypíše správný klíč.
    * *Skutečný výsledek:* **Úspěch**. Logika ve větvi `if (correctCount === 3) points = 1;` zafungovala správně.
* **Scénář 3: Expirace časového limitu**
    * *Postup:* Spuštění standardního testu s nastaveným limitem (např. uměle sníženým na 10 sekund pro účely testu). Uživatel nevyplní nic a čeká.
    * *Očekávaný výsledek:* Po uplynutí času se test sám ukončí, vyskočí modální okno s výsledkem (0 bodů), časovač se zastaví a zmizí tlačítko pro standardní odevzdání.
    * *Skutečný výsledek:* **Úspěch**. Proměnná `isTestActive` se přepne na `false` a zablokuje další změny.
* **Scénář 4: Responzivita (Mobilní zobrazení)**
    * *Postup:* Otevření aplikace přes vývojářské nástroje v režimu mobilního telefonu (šířka pod 600px).
    * *Očekávaný výsledek:* Obrázek v Hero sekci se skryje pro úsporu místa, testovací mřížka se zarovná, časovač zůstane "sticky" přilepený na horním okraji obrazovky i při scrollování dolů.
    * *Skutečný výsledek:* **Úspěch**. CSS pravidlo `@media (max-width: 600px)` aplikuje správné formátování.
* **Scénář 5: Drag & Drop seřazování**
    * *Postup:* Uživatel "chytne" položku v seřazovací úloze a přesune ji na jiné místo v seznamu.
    * *Očekávaný výsledek:* Pořadí se v DOMu fyzicky změní a při odevzdání testu skript `finishTest()` přečte toto nové pořadí a porovná jej s polem `correct_answer`.
    * *Skutečný výsledek:* **Úspěch**. Události `dragstart`, `dragover` a `dragend` správně aktualizují pozici prvku.

---

## 6. Jak projekt nasadit a spustit

Pro zprovoznění vlastní instance aplikace je potřeba provést následující kroky:

### Co budete potřebovat:
Webový prohlížeč.


### Postup zprovoznění:
Zadejte do prohlížeče https://ordinaryrock1.github.io/Prijimacky/ 
