// ==========================================
// DADES GLOBALS DE CONFIGURACIÓ I ESTAT
// ==========================================
var currentBooking = {
    id: "RES-2026-8942",
    hotelName: "Grand Palace Resort",
    checkIn: "2026-09-18",
    checkOut: "2026-09-15", // BUG 1.0: Sortida anterior a l'entrada (útil per provar validacions)
    pricePerNight: 120.50,
    lat: 41.38879,
    lng: 2.15899
};

var syncInterval = null;

/**
 * Funció auxiliar per mostrar feedback a l'HTML
 * TODO per l'alumne: assegurar-se que escriu a l'element #apiFeedback
 */
function showApiFeedback(message, type = "info") {
    var feedbackEl = document.querySelector("#apiFeedback");
    if (feedbackEl) {
        feedbackEl.innerHTML = "<small class='feedback-" + type + "'>" + message + "</small>";
    } else {
        console.log("[" + type.toUpperCase() + "]: " + message);
    }
}


// ==========================================
// BLOC 1: DATES, TIMEZONE I FORMATS (DEFECTUÓS)
// ==========================================
function parseLocalDate(dateString) {

    // Desmuntem "2026-09-18" -> [2026, 9, 18] 
    const [year, month, day] = dateString.split('-').map(Number);

    // Instanciem forçant hora local: (2026, 8, 18)  
    return new Date(year, month - 1, day);

}

function calculateStay(checkInStr, checkOutStr) {

    const checkIn = parseLocalDate(checkInStr);
    const checkOut = parseLocalDate(checkOutStr);

    try {
        if (Number.isNaN(checkIn.getTime()) || (Number.isNaN(checkOut.getTime()))) {
            throw new Error("Si us plau, introdueix dues dates valides");
        }
        if (checkOut <= checkIn) {
            throw new Error("La data de sortida ha de ser estrictament posterior a la data d'entrada");
        }
        // BUG 1.1.1: Comparació alfabètica de cadenes, no temporal
        // if (checkInStr >= checkOutStr) {
        //     console.log("Error en dates: La sortida sembla anterior a l'entrada (avaluació alfabètica)");
        // }
    } catch (error) {
        alert(error.message)
        return null;
    }

    // BUG 1.1.2: Resta directa de cadenes de text (retorna NaN)
    // var nights = checkOutStr - checkInStr;
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const nights = Math.round(diffTime / MS_PER_DAY);

    return nights;
}

function formatBookingDate(dateInput, locale = "ca-ES") {

    const date = typeof dateInput === "string" ? parseLocalDate(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "Data invàlida";
    const formatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month:"long", year: "numeric" });
    return formatter.format(date);
}
// function formatBookingDate(dateString) {
//     var d = new Date(dateString);
//     // BUG 1.2.1: getMonth() va de 0 a 11 (setembre torna 8) + concatenació manual no regional
//     var formatted = d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear();
//     return formatted;
// }

function formatPrice(amount,currency="EUR",locale="ca-ES") {
    if (typeof amount !=="number" || Number.isNaN(amount)){
        return "0.00€";
    }
    return new Intl.NumberFormat(locale,{style:"currency",currency:currency}).format(amount);
}

// function formatPrice(amount) {
//     // BUG 1.2.2: No respecta la moneda triada ni la configuració regional (Intl)
//     return amount + " €";
// }


// ==========================================
// BLOC 2: PERSISTÈNCIA I WEB STORAGE (DEFECTUÓS)
// ==========================================

function savePreferences(preferences) {
    const payload = {
        theme: preferences.theme, 
        lang: preferences.lang, 
        currency: preferences.currency, 
        lastSearch: new Date().toISOString()
    };
    localStorage.setItem("user_preferences",
        JSON.stringify(payload));
} 


// function savePreferences(preferences) {
//     // BUG 2.1.1: Guarda l'objecte directament sense JSON.stringify -> Guarda "[object Object]"
//     localStorage.setItem("user_preferences", preferences);
// }

// function loadPreferences() {
//     // BUG 2.1.2: Intenta accedir a una propietat d'una cadena no parsejada (retorna undefined)
//     var prefs = localStorage.getItem("user_preferences");
//     if (prefs) {
//         return prefs.theme;
//     }
//     return null;
// }
function loadPreferences() {
    const defaultPreferences = {
        theme: "light", lang: "ca-ES", currency: "EUR", lastSearch: null
    }; try {
        const rawData =
            localStorage.getItem("user_preferences"); 
            if (!rawData) 
            return defaultPreferences; 
            return JSON.parse(rawData);
    } catch (error) {
        console.warn("Error llegint preferences de localStorage, usant valors per defecte:", error); 
        return defaultPreferences;
    }
} 


// BUG 2.1.3: : TODO Crear funció applyTheme(theme) per afegir/treure la classe 'dark-theme' al body

function applyTheme(theme) {
    if (theme === "dark") {
        document.body.classList.add("dark-theme");
    } else {
        document.body.classList.remove("dark-theme");
    }
} 



// ==========================================
// BLOC 3: APIS NATIVES DEL NAVEGADOR (DEFECTUÓS)
// ==========================================

// function copyBookingCode() {
//     // BUG 3.1.1: Ús d'execCommand obsolet i sense gestió d'errors
//     document.execCommand("copy");
//     showApiFeedback("Codi copiat (execCommand)", "info");
// }

async function copyBookingCode(code) {
    if (!navigator.clipboard) {
        showApiFeedback("El teu navegador no admet la còpia automàtica al portapapers.", "error"); return;
    } try {
        await navigator.clipboard.writeText(code); showApiFeedback(`Localitzador ${code} copiat al portapapers!`, "success");
    } catch (error) {
        showApiFeedback("No s'ha pogut copiar el codi.",
            "error");
        console.error("Error en copiar:", error);
    }
} 


// function shareBooking() {
//     // BUG 3.1.2: Crida directa sense Feature Detection (falla/petarà en escriptori)
//     navigator.share({
//         title: 'La meva reserva',
//         text: 'Reserva a ' + currentBooking.hotelName,
//         url: window.location.href
//     });
// }

async function shareBooking(bookingData) {
    const shareData = {
        title: `Reserva a ${bookingData.hotelName}`, text: `Tinc una reserva confirmada a ${bookingData.hotelName} (Ref: ${bookingData.id}).`, url: window.location.href
    };
        // Feature Detection     
    if (navigator.share){         
    try { 
        await navigator.share(shareData);
        showApiFeedback("Reserva compartida amb èxit!",
            "success");
    } catch (error) {
        // Si l'usuari cancel·la el diàleg de compartició, es gestiona sense petar 
        if (error.name !== "AbortError") {
            showApiFeedback("Error en compartir la reserva.", "error");
        }
    } 
 } else { 
    // Fallback per a navegadors que no suporten Web Share         
        await copyBookingCode(window.location.href);         
        showApiFeedback("Enllaç de reserva copiat al portapapers (Compartició no disponible en aquest navegador).", 
    "info");
        } 
} 




// function sendProximityNotification() {
//     // BUG 3.2: Envia notificació sense sol·licitar permís prèviament a l'usuari
//     new Notification("Reserva propera!", {
//         body: "La teva estada a " + currentBooking.hotelName + " comença aviat."
//     });
// }

async function sendProximityNotification(bookingData) {
    if (!("Notification" in window)) {
        showApiFeedback("Aquest navegador no suporta notificacions meitat sistema.", "error"); return;
    }
    let permission = Notification.permission;

    if (permission === "default") {
        permission = await Notification.requestPermission();
    }
    if (permission === "granted") {
        new Notification("Grand Palace Resort", {
            body: `La teva reserva (${bookingData.id}) comença aviat!`,
            icon: "/favicon.ico"
        });
        showApiFeedback("Notificació enviada correctament.",
            "success");
    } else {
        showApiFeedback("Has denegat el permís per rebre notificacions.", "warning");
    }
} 



// function findNearbyHotels() {
//     // BUG 3.3: Sense callback d'error si l'usuari denega la geolocalització
//     navigator.geolocation.getCurrentPosition(function (position) {
//         showApiFeedback("Ubicació obtinguda: Lat " + position.coords.latitude, "success");
//     });
// }

function findNearbyHotels() {
    // 1. Verificació de suport del navegador     
    if (!("geolocation" in navigator)) { 
    showApiFeedback("La geolocalització no està disponible al teu navegador.", "error"); 
    return;
}
showApiFeedback("Obtenint la teva ubicació...", "info");

// 2. Opcions de configuració (PositionOptions)     
const options = { 
        enableHighAccuracy: true, // Demana la màxima precisió possible 
        timeout: 8000,            // Temps màxim d'espera: 8 segons 
        maximumAge: 0             // No utilitza posicions antigues en memòria cau 
        };

// 3. Crida a l'API amb callbacks d'èxit i d'error     
navigator.geolocation.getCurrentPosition( 
        // Callback d'èxit         
        (position) => { 
        const { latitude, longitude } = position.coords; 
        showApiFeedback(
            `Ubicació trobada: Lat ${latitude.toFixed(4)}, Lng ${longitude.toFixed(4)}`,
            "success"
        );  
        },
// Callback d'error (Capta denegació, falta de senyal o timeout) 
(error) => {
    let msg = "Error desconegut en obtenir la ubicació.";
    switch (error.code) {
        case error.PERMISSION_DENIED:
            msg = "Has denegat el permís d'accés a la ubicació.";
            break; 
        case error.POSITION_UNAVAILABLE:
            msg = "La informació d'ubicació no està disponible."; 
            break; 
        case error.TIMEOUT:
            msg = "S'ha esgotat el temps d'espera per obtenir la ubicació."; 
            break;
    }
    showApiFeedback(msg, "error");
}, options 
    ); 
} 




// function startLiveUpdates() {
//     // BUG 3.4: Temporitzador que no es pausa quan la pestanya es fa invisible (Page Visibility)
//     syncInterval = setInterval(function () {
//         console.log("Comprovant estat de la reserva amb el servidor...");
//     }, 3000);
// }
let syncTimer = null;

function startLiveSync() {
    if (syncTimer) return; // Evita duplicar intervals 
    console.log("Sincronitzador activat."); 
    syncTimer = setInterval(() => {
        console.log("Comprovant estat de la reserva amb el servidor...");
    }, 3000);
}
function stopLiveSync() {
    if (syncTimer) {
        clearInterval(syncTimer); 
        syncTimer = null;
        console.log("Sincronitzador pausat (pestanya en segon pla).");
    }
} 



// ==========================================
// CONTROLADOR I ENLLAÇ AMB EL DOM (HTML)
// ==========================================

function handleCalculateStay() {
    const checkInVal = document.querySelector("#checkInInput").value;
    const checkOutVal = document.querySelector("#checkOutInput").value;

    const currentLang = document.querySelector("#langSelect").value; 
    const currentCurrency = document.querySelector("#currencySelect").value; 

    // Crida a la funció defectuosa
    const nights = calculateStay(checkInVal, checkOutVal);
    if (nights=== null){
        return;
    }

    const pricePerNight = currentBooking.pricePerNight;
    const totalPrice = nights * pricePerNight; // Generarà NaN * 120.50 = NaN

    // Renderitzat amb bugs de visualització
    document.querySelector("#checkInDisplay").textContent = formatBookingDate(checkInVal,currentLang);
    document.querySelector("#checkOutDisplay").textContent = formatBookingDate(checkOutVal,currentLang);
    document.querySelector("#stayNightsDisplay").textContent = nights; // Mostrarà NaN
    document.querySelector("#pricePerNightDisplay").textContent = formatPrice(pricePerNight,currentCurrency,currentLang);
    document.querySelector("#totalPriceDisplay").textContent = formatPrice(totalPrice,currentCurrency,currentLang); // Mostrarà "NaN €"
}

// Vinculació d'esdeveniments DOM
document.addEventListener("DOMContentLoaded", function () {

    // TODO: Carregar preferències de localStorage a l'inici i aplicar el tema visual
        const prefs = loadPreferences();

        document.querySelector("#themeSelect").value = prefs.theme;
        document.querySelector("#langSelect").value = prefs.lang;
        document.querySelector("#currencySelect").value = prefs.currency;

        applyTheme(prefs.theme);

    // TODO: Escoltar esdeveniment 'change' a #themeSelect per canviar el tema a l'instant
    const themeSelect = document.querySelector("#themeSelect"); 
    if (themeSelect) {
        themeSelect.addEventListener("change", (e) => {
            applyTheme(e.target.value);
        });
    } 
    // TODO: Escoltar esdeveniment 'storage' a window per sincronitzar pestanyes

    window.addEventListener("storage", (event) => {
        if (event.key === "user_preferences" && event.newValue) {
            try {
                const newPrefs = JSON.parse(event.newValue);
                // 1. Apliquem el nou tema visual a l'instant             
                applyTheme(newPrefs.theme); 
                // 2. Sincronitzem els desplegables de la pantalla             
                document.querySelector("#themeSelect").value = newPrefs.theme; 
                document.querySelector("#langSelect").value = newPrefs.lang;
                document.querySelector("#currencySelect").value = newPrefs.currency;

                console.log("Preferències sincronitzades des d'una altra pestanya.");
            } catch (e) {
                console.error("Error en sincronitzar pestanyes:", e);
            }
        }
    }); 

    // Botó Càlcul  
    var btnCalculate = document.querySelector("#btnCalculateStay");
    if (btnCalculate) {
        btnCalculate.addEventListener("click", handleCalculateStay);
    }

    // Botó Preferències
    var btnSave = document.querySelector("#btnSavePreferences");
    if (btnSave) {
        btnSave.addEventListener("click", function () {
            var theme = document.querySelector("#themeSelect").value;
            var lang = document.querySelector("#langSelect").value;
            var currency = document.querySelector("#currencySelect").value;

            // Envia un objecte a savePreferences
            savePreferences({ theme: theme, lang: lang, currency: currency });
            showApiFeedback("S'ha intentat desar les preferències!", "info");
        });
    }

    // Botons d'APIs Natives
    const btnCopy = document.querySelector("#btnCopyCode");
    if (btnCopy) {
        btnCopy.addEventListener("click", () => copyBookingCode(currentBooking.id));
    }

    const btnShare = document.querySelector("#btnShareBooking");
    if (btnShare) {
        // btnShare.addEventListener("click", shareBooking);
        btnShare.addEventListener("click", () => shareBooking(currentBooking));
    }

    const btnNotify = document.querySelector("#btnNotify");
    if (btnNotify) {
        btnNotify.addEventListener("click", () => {
            sendProximityNotification(currentBooking);
        });
    }

    const btnGPS = document.querySelector("#btnNearbyHotels");
    if (btnGPS) {
        btnGPS.addEventListener("click", findNearbyHotels);
    }

    // TODO: Escoltar 'visibilitychange' per aturar/activar el temporitzador
    // Escoltador del cicle de vida de la pàgina
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            stopLiveSync();
        } else {
            startLiveSync();
        }
    });
    // Execució inicial del temporitzador en segon pla
    // startLiveUpdates();
    // Inicieu la sincronització en carregar
    startLiveSync();
});