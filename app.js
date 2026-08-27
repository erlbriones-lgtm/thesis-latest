// app.js

const OFFICIAL_FEEDBACK_EMAIL = 'fredianmherl.masas@bisu.edu.ph';
window.OFFICIAL_FEEDBACK_EMAIL = OFFICIAL_FEEDBACK_EMAIL;

document.addEventListener('DOMContentLoaded', () => {
    // === Variables & Elements ===
    const currentDatetimeEl = document.getElementById('current-datetime');
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    // Export Print functions to window level to allow onclick attributes to work
    const BASE_BODY_CLASSES = ['text-slate-800', 'antialiased', 'min-h-screen', 'flex', 'flex-col', 'relative', 'overflow-x-hidden'];

    function clearPrintBodyClasses() {
        [...document.body.classList].forEach((cls) => {
            if (cls.startsWith('print-')) document.body.classList.remove(cls);
        });
        BASE_BODY_CLASSES.forEach((cls) => document.body.classList.add(cls));
        // Keep admin-layout if admin view is still open
        if (document.getElementById('view-admin') && !document.getElementById('view-admin').classList.contains('section-hidden')) {
            document.body.classList.add('admin-layout');
        }
    }

    let printCleanupTimer = null;

    let cachedLogos = {
        bisu: '',
        bagongPilipinas: '',
        tuv: ''
    };

    async function getPngDataUrl(imagePath) {
        if (!imagePath) return '';
        if (imagePath.startsWith('data:image/png') || imagePath.startsWith('data:image/jpeg')) {
            return imagePath;
        }
        return new Promise((resolve) => {
            const img = new Image();
            if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width || 120;
                    canvas.height = img.naturalHeight || img.height || 120;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    resolve(pngDataUrl);
                } catch (e) {
                    console.error("Canvas PNG conversion error:", e);
                    resolve('');
                }
            };
            img.onerror = () => {
                // Fallback without crossOrigin if error occurred
                const imgFallback = new Image();
                imgFallback.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = imgFallback.naturalWidth || imgFallback.width || 120;
                        canvas.height = imgFallback.naturalHeight || imgFallback.height || 120;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(imgFallback, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } catch (err) {
                        resolve('');
                    }
                };
                imgFallback.onerror = () => resolve('');
                imgFallback.src = imagePath;
            };
            img.src = imagePath;
        });
    }

    async function fetchAsPngDataUrl(path) {
        const filename = path.split('/').pop();
        const origin = window.location.origin;
        const candidatePaths = [
            path,
            `${origin}/images/${filename}`,
            `${origin}/public/images/${filename}`,
            `/images/${filename}`,
            `/public/images/${filename}`,
            `images/${filename}`
        ];
        for (const candidate of candidatePaths) {
            try {
                const res = await fetch(candidate);
                if (!res.ok) continue;
                const blob = await res.blob();
                if (blob && blob.size > 0) {
                    const objectUrl = URL.createObjectURL(blob);
                    const pngDataUrl = await getPngDataUrl(objectUrl);
                    URL.revokeObjectURL(objectUrl);
                    if (pngDataUrl && pngDataUrl.startsWith('data:image/png')) {
                        return pngDataUrl;
                    }
                }
            } catch (e) {
                // Try next candidate
            }
        }
        for (const candidate of candidatePaths) {
            const pngDataUrl = await getPngDataUrl(candidate);
            if (pngDataUrl && pngDataUrl.startsWith('data:image/png')) {
                return pngDataUrl;
            }
        }
        return '';
    }

    async function initLogoCache() {
        try {
            if (window.EMBEDDED_LOGOS) {
                if (window.EMBEDDED_LOGOS.bisu) cachedLogos.bisu = window.EMBEDDED_LOGOS.bisu;
                if (window.EMBEDDED_LOGOS.bagongPilipinas) cachedLogos.bagongPilipinas = window.EMBEDDED_LOGOS.bagongPilipinas;
                if (window.EMBEDDED_LOGOS.tuv) cachedLogos.tuv = window.EMBEDDED_LOGOS.tuv;
            }
            if (!cachedLogos.bisu) cachedLogos.bisu = await fetchAsPngDataUrl('/images/BISU_sm.png');
            if (!cachedLogos.bagongPilipinas) cachedLogos.bagongPilipinas = await fetchAsPngDataUrl('/images/BP_sm.png');
            if (!cachedLogos.tuv) cachedLogos.tuv = await fetchAsPngDataUrl('/images/TUV_sm.png');
        } catch(e) {
            console.warn('Logo cache preloading warning:', e);
        }
    }

    initLogoCache();

    function prepareSectionForPrint(sectionEl) {
        if (!sectionEl) return '';
        const clone = sectionEl.cloneNode(true);

        // Remove buttons, inputs, selects, print-hidden elements, and swipe helpers
        clone.querySelectorAll('.print\\:hidden, button, select, input, [class*="print:hidden"], .xl\\:hidden').forEach(el => el.remove());

        // Strip container card classes so the section renders un-enclosed and seamless like an official form
        clone.classList.remove('bg-white', 'rounded-2xl', 'rounded-xl', 'shadow-2xs', 'shadow-sm', 'shadow-md', 'border', 'border-slate-200', 'overflow-hidden', 'p-4', 'p-5', 'mb-7', 'mb-8');
        clone.style.border = 'none';
        clone.style.boxShadow = 'none';
        clone.style.background = 'transparent';
        clone.style.borderRadius = '0';
        clone.style.padding = '0';

        // Clean up header bars inside section to be simple un-boxed title text
        clone.querySelectorAll('.bg-slate-50\\/80, .bg-slate-50, .border-b').forEach(headerDiv => {
            headerDiv.classList.remove('bg-slate-50/80', 'bg-slate-50', 'border-b', 'border-slate-200', 'px-6', 'py-4', 'p-4', 'rounded-t-2xl');
            headerDiv.style.background = 'transparent';
            headerDiv.style.border = 'none';
            headerDiv.style.padding = '0 0 6px 0';
        });

        // Remove decorative icon badge boxes in section headers
        clone.querySelectorAll('.w-9.h-9, .w-11.h-11').forEach(iconDiv => {
            if (iconDiv.querySelector('i')) iconDiv.remove();
        });

        // Remove table wrapper padding & overflow constraints
        clone.querySelectorAll('.p-4, .overflow-x-auto, .custom-scrollbar').forEach(wrapper => {
            wrapper.classList.remove('p-4', 'overflow-x-auto', 'custom-scrollbar');
            wrapper.style.padding = '0';
            wrapper.style.overflow = 'visible';
        });

        // Clean up empty action cells in table rows
        clone.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('th, td');
            cells.forEach(cell => {
                if (cell.textContent.trim().toLowerCase() === 'action' || cell.classList.contains('print:hidden') || (cell.children.length === 0 && cell.getAttribute('class')?.includes('print:hidden'))) {
                    cell.remove();
                }
            });
        });

        return clone.outerHTML;
    }

    function getAssessmentPeriodStr(title = '', feedbacks = [], complaints = []) {
        if (title) {
            let cleaned = title.replace(/^Archive\s*-\s*/i, '').replace(/^Archive\s*Batch\s*/i, '').trim();
            if (cleaned && !cleaned.toLowerCase().includes('all archived vault records') && !cleaned.toLowerCase().startsWith('batch_')) {
                return cleaned;
            }
        }

        const archivedMonthSelect = document.getElementById('archived-month-filter');
        if (archivedMonthSelect && archivedMonthSelect.value !== 'ALL') {
            const opt = archivedMonthSelect.options[archivedMonthSelect.selectedIndex];
            if (opt && opt.text) return opt.text;
        }

        const dates = [];
        [...(feedbacks || []), ...(complaints || [])].forEach(item => {
            const dStr = item.created_at || item.archived_at || item.date || item.created_date;
            if (dStr) {
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) dates.push(d);
            }
        });

        if (dates.length > 0) {
            dates.sort((a, b) => a - b);
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];
            const minMonthYear = minDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const maxMonthYear = maxDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            if (minMonthYear === maxMonthYear) {
                return minMonthYear;
            } else {
                return `${minMonthYear} - ${maxMonthYear}`;
            }
        }

        const monthSelect = document.getElementById('filter-month-select');
        const yearSelect = document.getElementById('filter-year-select');
        const mText = monthSelect && monthSelect.value !== 'all' ? monthSelect.options[monthSelect.selectedIndex].text : '';
        const yText = yearSelect && yearSelect.value !== 'all' ? yearSelect.value : new Date().getFullYear();
        return mText ? `${mText} ${yText}` : `${yText}`;
    }

    function printHTMLDocument(title, contentHtml, feedbacks = [], complaints = []) {
        const periodStr = getAssessmentPeriodStr(title, feedbacks, complaints);

        const bisuLogo = cachedLogos.bisu || new URL('/images/BISU.webp', window.location.origin).href;
        const bagongPilipinasLogo = cachedLogos.bagongPilipinas || new URL('/images/BAGONG-PILIPINAS-LOGO-1-1.webp', window.location.origin).href;
        const tuvLogo = cachedLogos.tuv || new URL('/images/images.webp', window.location.origin).href;

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <base href="${window.location.origin}/">
                <title>${escapeHtml(title)} - BISU Calape Campus</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    @page { size: landscape; margin: 8mm 10mm; }
                    * { box-shadow: none !important; text-shadow: none !important; }
                    body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; background: #ffffff !important; color: #000000 !important; padding: 15px; margin: 0; }
                    .no-print { display: flex; }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; }
                        @page { margin: 8mm 10mm; }
                    }

                    /* Seamless un-enclosed official form styling */
                    [id^="section-table-"], .bg-white, .bg-slate-50, .bg-slate-50\/80, .rounded-2xl, .rounded-xl, .shadow-2xs, .shadow-sm {
                        border: none !important;
                        background: transparent !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding-left: 0 !important;
                        padding-right: 0 !important;
                    }

                    h3 {
                        font-family: Arial, sans-serif !important;
                        font-weight: bold !important;
                        color: #000000 !important;
                        text-transform: uppercase !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 6px !important;
                        margin-bottom: 16px !important;
                        table-layout: auto !important;
                        background-color: #ffffff !important;
                        border: 1px solid #000000 !important;
                    }
                    table th, table td {
                        border: 1px solid #000000 !important;
                        color: #000000 !important;
                        padding: 5px 4px !important;
                        font-size: 8pt !important;
                        line-height: 1.2 !important;
                        text-align: center;
                        border-radius: 0 !important;
                    }
                    table thead th {
                        background-color: #f1f5f9 !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                        font-size: 7.5pt !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    table tfoot td {
                        background-color: #f8fafc !important;
                        font-weight: bold !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .text-left { text-align: left !important; }
                    .text-right { text-align: right !important; }
                    .logo-header-img { height: 64px; width: auto; object-fit: contain; }
                </style>
            </head>
            <body class="bg-white text-black font-sans">
                <!-- Top Floating Action Toolbar -->
                <div class="no-print fixed top-4 right-4 bg-[#120042] text-white p-2.5 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 z-50 backdrop-blur-md">
                    <div class="flex items-center gap-2 px-3 border-r border-white/20 text-blue-100">
                        <i class="fa-solid fa-file-signature text-amber-400 text-sm"></i>
                        <span class="text-xs font-bold tracking-wide">${escapeHtml(title)}</span>
                    </div>
                    <button onclick="window.print()" class="bg-[#22007c] hover:bg-blue-800 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md border border-white/10 hover:border-amber-300">
                        <i class="fa-solid fa-print"></i> Print Document / Save as PDF
                    </button>
                    <button onclick="window.close()" class="bg-white/10 hover:bg-white/20 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer">
                        <i class="fa-solid fa-xmark mr-1"></i> Close
                    </button>
                </div>

                <!-- Printable Formal Institutional Letterhead -->
                <div class="printable-letterhead flex flex-col items-center justify-center mb-4 pb-3 border-b border-slate-400 w-full pt-1 text-center font-sans">
                    <!-- Trio Logo Row -->
                    <div class="flex items-center justify-center gap-8 mb-2">
                        <img src="${bisuLogo}" class="logo-header-img" alt="BISU Logo" />
                        <img src="${bagongPilipinasLogo}" class="logo-header-img" alt="Bagong Pilipinas Logo" />
                        <img src="${tuvLogo}" class="logo-header-img rounded" alt="TÜV Rheinland Logo" />
                    </div>
                    
                    <!-- Institutional Title Hierarchy -->
                    <div class="font-sans text-black space-y-0.5 max-w-4xl">
                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-600">Republic of the Philippines</p>
                        <h1 class="text-lg font-bold uppercase tracking-wide text-black">Bohol Island State University</h1>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800">Calape Campus</h2>
                        <p class="text-xs text-slate-600 italic">San Isidro, Calape, Bohol &bull; Quality Management System</p>
                    </div>

                    <!-- Document Title Header -->
                    <div class="mt-3 pt-2 border-t border-slate-300 w-full max-w-4xl">
                        <h2 class="text-sm font-bold text-black uppercase tracking-wide text-center">${escapeHtml(title)}</h2>
                        <div class="flex items-center justify-center flex-wrap gap-4 text-[11px] font-semibold text-slate-700 mt-1">
                            <span>Assessment Period: <strong class="text-black font-bold">${escapeHtml(periodStr)}</strong></span>
                            ${(currentUserRole === 'office' && currentOfficeScope) ? `<span>&bull; Office Concerned: <strong class="text-black font-bold">${escapeHtml(currentOfficeScope)}</strong></span>` : ''}
                            <span>&bull; ISO 9001:2015 Certified</span>
                        </div>
                    </div>
                </div>

                <!-- Main Report Body (Seamless Form) -->
                <div class="w-full space-y-4">
                    ${contentHtml}
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            try { window.print(); } catch(e) {}
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        // Strategy 1: Open popup window
        let printWin = null;
        try {
            printWin = window.open('', '_blank');
        } catch (e) {
            printWin = null;
        }

        if (printWin) {
            printWin.document.open();
            printWin.document.write(fullHtml);
            printWin.document.close();
            return;
        }

        // Strategy 2: Fallback to hidden iframe
        let iframe = document.getElementById('bisu-print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'bisu-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.top = '-9999px';
            iframe.style.left = '-9999px';
            iframe.style.width = '1000px';
            iframe.style.height = '1000px';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(fullHtml);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Print iframe error:', err);
                window.print();
            }
        }, 400);
    }

    function runPrint(printClasses) {
        clearPrintBodyClasses();
        if (printCleanupTimer) {
            clearTimeout(printCleanupTimer);
            printCleanupTimer = null;
        }

        printClasses.forEach((cls) => document.body.classList.add(cls));

        const restore = () => {
            clearPrintBodyClasses();
            window.removeEventListener('afterprint', restore);
        };

        window.addEventListener('afterprint', restore, { once: true });

        printCleanupTimer = setTimeout(() => {
            clearPrintBodyClasses();
        }, 15000);

        setTimeout(() => {
            try {
                window.focus();
                window.print();
            } catch (err) {
                console.error('Error invoking window.print():', err);
            }
        }, 50);
    }

    window.printAll = function() {
        const titleEl = document.getElementById('print-title-summary');
        const reportTitle = document.getElementById('print-title-report');
        if (titleEl) {
            titleEl.textContent = "MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT";
            titleEl.classList.remove('hidden');
        }
        if (reportTitle) reportTitle.classList.add('hidden');

        const secA = document.getElementById('section-table-a');
        const secB = document.getElementById('section-table-b');
        const secC = document.getElementById('section-table-c');

        const htmlA = prepareSectionForPrint(secA);
        const htmlB = prepareSectionForPrint(secB);
        const htmlC = prepareSectionForPrint(secC);

        printHTMLDocument("MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT", htmlA + htmlB + htmlC);
        runPrint(['print-all']);
    };

    window.printSpecificTable = function(tableId) {
        const titleEl = document.getElementById('print-title-summary');
        const reportTitle = document.getElementById('print-title-report');
        if (reportTitle) reportTitle.classList.add('hidden');

        let title = "MONTHLY CUSTOMER SATISFACTION REPORT";
        let sectionEl = null;

        if (tableId === 'table-a') {
            sectionEl = document.getElementById('section-table-a');
            title = "A. CITIZEN'S CHARTER SUMMARY RESULT";
        } else if (tableId === 'table-b') {
            sectionEl = document.getElementById('section-table-b');
            title = "B. CUSTOMER SATISFACTION FEEDBACK (CSF) MONTHLY RATING";
        } else if (tableId === 'table-c') {
            sectionEl = document.getElementById('section-table-c');
            title = "C. CSF COMMENDATIONS AND SUGGESTIONS";
        }

        if (titleEl) {
            titleEl.textContent = title;
            titleEl.classList.remove('hidden');
        }

        if (sectionEl) {
            const html = prepareSectionForPrint(sectionEl);
            printHTMLDocument(title, html);
        }

        runPrint([`print-${tableId}`]);
    };

    window.printReportCard = function(officeName) {
        const titleEl = document.getElementById('print-title-summary');
        const reportTitle = document.getElementById('print-title-report');
        if (titleEl) titleEl.classList.add('hidden');
        if (reportTitle) reportTitle.classList.remove('hidden');

        const officeEl = document.getElementById('print-office-concerned');
        if (officeEl) officeEl.textContent = officeName || '_____________________';

        const monthSelect = document.getElementById('filter-month-select');
        const yearSelect = document.getElementById('filter-year-select');
        const mText = monthSelect && monthSelect.value !== 'all' ? monthSelect.options[monthSelect.selectedIndex].text : '';
        const yText = yearSelect && yearSelect.value !== 'all' ? yearSelect.value : new Date().getFullYear();
        const printMonthEl = document.getElementById('print-month-year');
        if (printMonthEl) {
            printMonthEl.textContent = mText ? `${mText} ${yText}` : `${yText}`;
        }

        const secB = document.getElementById('section-table-b');
        if (secB) {
            const clone = secB.cloneNode(true);
            if (officeName) {
                clone.querySelectorAll('tbody tr').forEach(tr => {
                    const firstTd = tr.querySelector('td');
                    if (firstTd && !firstTd.textContent.trim().toLowerCase().includes(officeName.toLowerCase())) {
                        tr.remove();
                    }
                });
            }
            const html = prepareSectionForPrint(clone);
            const reportHeader = `
                <div class="w-full text-center mb-4">
                    <h2 class="text-xl font-black text-slate-900 uppercase">MONTHLY REPORT CARD</h2>
                    <div class="flex justify-between items-center text-xs font-bold uppercase mt-2 px-2 border-b-2 border-slate-900 pb-2">
                        <div>Office Concerned: <span class="text-bisu-blue font-black px-2">${escapeHtml(officeName || 'All Offices')}</span></div>
                        <div>Month / Period: <span class="px-2">${escapeHtml(mText ? `${mText} ${yText}` : `${yText}`)}</span></div>
                    </div>
                </div>
            `;
            printHTMLDocument(`MONTHLY REPORT CARD - ${officeName || 'ALL OFFICES'}`, reportHeader + html);
        }

        runPrint(['print-report', 'print-table-b']);
    };

    function generateAndDownloadDocFile(filename, subject, bodyStr, customHtml) {
        const cleanTitle = escapeHtml(subject || 'BISU Official Record Document');
        const docHeader = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>${cleanTitle}</title>
            <style>
                body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; padding: 30px; line-height: 1.6; }
                .letterhead { text-align: center; border-bottom: 2px solid #E84A1C; padding-bottom: 15px; margin-bottom: 25px; }
                .univ-title { font-size: 16pt; font-weight: bold; color: #120042; text-transform: uppercase; margin: 0; }
                .campus-title { font-size: 11pt; color: #64748b; font-weight: bold; margin-top: 4px; }
                .doc-heading { font-size: 13pt; color: #E84A1C; font-weight: bold; margin-top: 15px; text-align: center; text-transform: uppercase; }
                .body-box { font-family: 'Courier New', monospace; font-size: 10pt; background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 18px; border-radius: 6px; white-space: pre-wrap; line-height: 1.5; margin-top: 15px; color: #0f172a; }
                .footer { margin-top: 35px; font-size: 9pt; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 12px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="letterhead">
                <div class="univ-title">Bohol Island State University</div>
                <div class="campus-title">Calape Campus • Customer Satisfaction & Feedback System</div>
                <div class="doc-heading">${cleanTitle}</div>
            </div>
            ${customHtml || `<div class="body-box">${escapeHtml(bodyStr)}</div>`}
            <div class="footer">
                Document Code: F-AQA-CSF-001 | Revision: 03<br>
                Bohol Island State University • Quality Management System
            </div>
        </body>
        </html>`;

        const blob = new Blob(['\ufeff', docHeader], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const finalName = filename ? (filename.endsWith('.doc') ? filename : filename + '.doc') : 'BISU_Official_Document.doc';
        a.download = finalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function generateAndDownloadPdfReportFile(filename, subject, bodyStr) {
        try {
            if (!window.jspdf || !window.jspdf.jsPDF) return;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');

            if (window.EMBEDDED_LOGOS) {
                if (!cachedLogos.bisu && window.EMBEDDED_LOGOS.bisu) cachedLogos.bisu = window.EMBEDDED_LOGOS.bisu;
                if (!cachedLogos.bagongPilipinas && window.EMBEDDED_LOGOS.bagongPilipinas) cachedLogos.bagongPilipinas = window.EMBEDDED_LOGOS.bagongPilipinas;
                if (!cachedLogos.tuv && window.EMBEDDED_LOGOS.tuv) cachedLogos.tuv = window.EMBEDDED_LOGOS.tuv;
            }
            if (!cachedLogos.bisu) {
                cachedLogos.bisu = await fetchAsPngDataUrl('/images/BISU_sm.png');
            }
            if (!cachedLogos.bagongPilipinas) {
                cachedLogos.bagongPilipinas = await fetchAsPngDataUrl('/images/BP_sm.png');
            }
            if (!cachedLogos.tuv) {
                cachedLogos.tuv = await fetchAsPngDataUrl('/images/TUV_sm.png');
            }

            if (cachedLogos.bisu && cachedLogos.bisu.startsWith('data:')) {
                try { doc.addImage(cachedLogos.bisu, 'PNG', 15, 10, 16, 16); } catch (e) {}
            }
            if (cachedLogos.tuv && cachedLogos.tuv.startsWith('data:')) {
                try { doc.addImage(cachedLogos.tuv, 'PNG', 160, 10, 16, 16); } catch (e) {}
            }
            if (cachedLogos.bagongPilipinas && cachedLogos.bagongPilipinas.startsWith('data:')) {
                try { doc.addImage(cachedLogos.bagongPilipinas, 'PNG', 178, 10, 16, 16); } catch (e) {}
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Republic of the Philippines', 105, 13, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(34, 0, 124);
            doc.text('BOHOL ISLAND STATE UNIVERSITY', 105, 18, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text('CALAPE CAMPUS', 105, 22.5, { align: 'center' });

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('San Isidro, Calape, Bohol • Quality Management System', 105, 26.5, { align: 'center' });

            doc.setDrawColor(220, 38, 38);
            doc.setLineWidth(0.6);
            doc.line(15, 29.5, 195, 29.5);

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.3);
            doc.roundedRect(15, 33, 180, 14, 2, 2, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(22, 18, 117);
            const titleLines = doc.splitTextToSize((subject || 'OFFICIAL REPORT RECORD').toUpperCase(), 172);
            doc.text(titleLines, 105, 39, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`Official Dispatch Sender: ${OFFICIAL_FEEDBACK_EMAIL} • Generated on ${new Date().toLocaleString()}`, 105, 44, { align: 'center' });

            doc.setFillColor(255, 255, 255);
            doc.roundedRect(15, 51, 180, 222, 2, 2, 'S');

            doc.setFont('courier', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);

            const cleanBody = bodyStr || '';
            const bodyLines = doc.splitTextToSize(cleanBody, 170);

            let yPos = 57;
            for (let i = 0; i < bodyLines.length; i++) {
                if (yPos > 265) {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(148, 163, 184);
                    doc.text('Document Code: F-AQA-CSF-001 | Revision: 03 • Bohol Island State University', 105, 288, { align: 'center' });

                    doc.addPage();
                    yPos = 20;
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(15, 15, 180, 260, 2, 2, 'S');
                    doc.setFont('courier', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(15, 23, 42);
                }
                doc.text(bodyLines[i], 20, yPos);
                yPos += 3.8;
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('Document Code: F-AQA-CSF-001 | Revision: 03 • Bohol Island State University • Quality Management System', 105, 288, { align: 'center' });

            const finalPdfName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
            doc.save(finalPdfName);
        } catch (err) {
            console.warn('PDF export error:', err);
        }
    }

    function generateAndDownloadTxtFile(filename, bodyStr) {
        const blob = new Blob([bodyStr], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = filename ? filename.replace(/\.doc$/, '').replace(/\.pdf$/, '') : 'BISU_Official_Document';
        a.download = baseName.endsWith('.txt') ? baseName : baseName + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function forwardEmailReport(targetEmail, subject, bodyStr, customHtml, customFilename, selectedFormat = 'pdf') {
        const rawBase = customFilename ? customFilename.replace(/\.(doc|docx|pdf|txt)$/i, '') : `BISU_Report_${subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}`;
        const isPdf = selectedFormat === 'pdf';
        const activeFileName = isPdf ? `${rawBase}.pdf` : `${rawBase}.doc`;

        const emailNoticeBody = `[OFFICIAL BISU CALAPE REPORT DISPATCH]\n` +
                                `Official Sender: ${OFFICIAL_FEEDBACK_EMAIL}\n` +
                                `Destination Recipient: ${targetEmail}\n` +
                                `Report Format: ${isPdf ? 'PDF Document (.pdf)' : 'Word Document (.docx / .doc)'}\n` +
                                `Generated Reference: ${activeFileName}\n\n` +
                                `==================================================\n` +
                                bodyStr;

        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(emailNoticeBody);
        const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?cc=${encodeURIComponent(OFFICIAL_FEEDBACK_EMAIL)}&subject=${encodedSubject}&body=${encodedBody}`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&cc=${encodeURIComponent(OFFICIAL_FEEDBACK_EMAIL)}&su=${encodedSubject}&body=${encodedBody}`;

        Swal.fire({
            title: 'Send Report Document',
            html: `
                <div class="text-center font-sans space-y-3">
                    <div class="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-600 text-left space-y-1">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400 font-bold uppercase text-[10px]">Recipient:</span>
                            <strong class="text-bisu-blue font-bold text-xs truncate max-w-[240px]">${escapeHtml(targetEmail)}</strong>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-slate-400 font-bold uppercase text-[10px]">Format:</span>
                            <span class="font-extrabold text-[11px] ${isPdf ? 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200' : 'text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200'}">
                                <i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-file-word'} mr-1"></i> ${isPdf ? 'PDF Document (.pdf)' : 'Word Document (.docx / .doc)'}
                            </span>
                        </div>
                    </div>

                    <!-- Step-by-Step Info Box -->
                    <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-left flex items-start gap-2 text-[11px] text-amber-900">
                        <i class="fa-solid fa-circle-info text-amber-600 mt-0.5 text-xs shrink-0"></i>
                        <span>
                            Clicking below downloads your <b>${isPdf ? '.pdf' : '.doc'}</b> file and opens Gmail with the recipient, CC, and report text ready. Just drag or attach the downloaded file into Gmail!
                        </span>
                    </div>

                    <!-- Direct Send Actions -->
                    <div class="flex flex-col gap-2 pt-1">
                        <button id="btn-open-gmail-with-file" type="button" class="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer">
                            <i class="fa-brands fa-google text-sm"></i> Download ${isPdf ? 'PDF' : 'DOCX'} & Open Gmail
                        </button>

                        <button id="btn-open-mailto-with-file" type="button" class="w-full py-2.5 px-4 bg-[#22007c] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer">
                            <i class="fa-solid fa-envelope text-sm"></i> Download ${isPdf ? 'PDF' : 'DOCX'} & Open Mail App
                        </button>
                    </div>

                    <!-- Secondary Tools -->
                    <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 mt-2">
                        <button id="btn-ondemand-download" type="button" class="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 cursor-pointer">
                            <i class="fa-solid fa-download text-xs ${isPdf ? 'text-rose-600' : 'text-blue-600'}"></i> Re-download File
                        </button>

                        <button id="btn-copy-forward-text" type="button" class="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 cursor-pointer">
                            <i class="fa-regular fa-copy text-xs text-slate-500"></i> Copy Content
                        </button>
                    </div>
                </div>
            `,
            iconHtml: '<div class="w-14 h-14 bg-blue-50 text-bisu-blue rounded-full flex items-center justify-center mx-auto mb-1 shadow-sm border border-blue-100"><i class="fa-solid fa-paper-plane text-xl"></i></div>',
            customClass: {
                icon: 'border-0 mb-0 w-full',
                popup: 'rounded-3xl shadow-2xl font-sans pb-4 border border-slate-100 max-w-md',
                title: 'text-xl font-black text-slate-800 tracking-tight mt-1',
                confirmButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-6 py-2.5 text-xs shadow-2xs transition-all mt-2 cursor-pointer'
            },
            confirmButtonText: 'Done / Close',
            buttonsStyling: false,
            didOpen: () => {
                function triggerFileDownload() {
                    if (isPdf) {
                        generateAndDownloadPdfReportFile(activeFileName, subject, bodyStr);
                    } else {
                        generateAndDownloadDocFile(activeFileName, subject, bodyStr, customHtml);
                    }
                }

                const gmailBtn = document.getElementById('btn-open-gmail-with-file');
                if (gmailBtn) {
                    gmailBtn.addEventListener('click', () => {
                        triggerFileDownload();
                        showToast(`Downloaded ${activeFileName}. Opening Gmail...`, 'info');
                        setTimeout(() => {
                            window.open(gmailUrl, '_blank', 'noopener,noreferrer');
                        }, 400);
                    });
                }

                const mailtoBtn = document.getElementById('btn-open-mailto-with-file');
                if (mailtoBtn) {
                    mailtoBtn.addEventListener('click', () => {
                        triggerFileDownload();
                        showToast(`Downloaded ${activeFileName}. Opening mail app...`, 'info');
                        setTimeout(() => {
                            window.location.href = mailtoUrl;
                        }, 400);
                    });
                }

                const downloadBtn = document.getElementById('btn-ondemand-download');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => {
                        triggerFileDownload();
                        showToast(`${isPdf ? 'PDF' : 'Word'} Document downloaded!`, 'success');
                    });
                }

                const copyBtn = document.getElementById('btn-copy-forward-text');
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(bodyStr).then(() => {
                            showToast('Report text copied to clipboard!', 'success');
                        }).catch(() => {
                            showToast('Failed to copy text.', 'error');
                        });
                    });
                }
            }
        });
    }

    function getReportEmailData(reportType) {
        const monthSelect = document.getElementById('filter-month-select');
        const yearSelect = document.getElementById('filter-year-select');
        const mText = monthSelect && monthSelect.value !== 'all' ? monthSelect.options[monthSelect.selectedIndex].text : '';
        const yText = yearSelect && yearSelect.value !== 'all' ? yearSelect.value : new Date().getFullYear();
        const periodStr = mText ? `${mText} ${yText}` : `${yText}`;

        if (reportType === 'MRC') {
            const officeSelect = document.getElementById('office-report-card-select');
            const targetOffice = officeSelect ? officeSelect.value : '';
            const officeName = targetOffice || 'All Offices';
            
            let officeFeedbacks = lastFilteredFeedbacks || [];
            if (targetOffice) {
                officeFeedbacks = officeFeedbacks.filter(f => (f.office_visited || '').toLowerCase().includes(targetOffice.toLowerCase()));
            }
            
            const count = officeFeedbacks.length;
            let avg = '0.00';
            let ratingDesc = 'N/A';
            
            if (count > 0) {
                const sum = officeFeedbacks.reduce((acc, row) => acc + parseFloat(row.mean_score || 0), 0);
                avg = (sum / count).toFixed(2);
                ratingDesc = getDesc(parseFloat(avg)).toUpperCase();
            }
            
            const activeDimensions = (typeof formConfig !== 'undefined' && formConfig.dimensions && formConfig.dimensions['en']) || [];
            let sqdLines = '';
            activeDimensions.forEach(d => {
                let dSum = 0;
                let dCount = 0;
                officeFeedbacks.forEach(row => {
                    const r = row.ratings || row || {};
                    if (r[d.id]) {
                        dSum += parseInt(r[d.id]);
                        dCount++;
                    }
                });
                const dAvg = dCount > 0 ? (dSum / dCount).toFixed(2) : 'N/A';
                sqdLines += `- ${d.id.toUpperCase()} (${d.label.split('.').pop().trim()}): ${dAvg}\n`;
            });
            
            const subject = `[BISU CSFS] Monthly Report Card - ${officeName} (${periodStr})`;
            let bodyStr = `BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS\n`;
            bodyStr += `OFFICIAL MONTHLY REPORT CARD (MRC)\n`;
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Office Concerned: ${officeName}\n`;
            bodyStr += `Period: ${periodStr}\n`;
            bodyStr += `Generated On: ${new Date().toLocaleString()}\n\n`;
            bodyStr += `SUMMARY METRICS:\n`;
            bodyStr += `Total Submissions: ${count}\n`;
            bodyStr += `Average Rating Score: ${avg} / 5.0 (${ratingDesc})\n\n`;
            if (sqdLines) {
                bodyStr += `SERVICE QUALITY DIMENSIONS BREAKDOWN:\n${sqdLines}\n`;
            }
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Document Code: F-AQA-CSF-001 | Revision: 03\n`;
            bodyStr += `Bohol Island State University • Quality Management System`;
            
            return { subject, bodyStr };
        }

        if (reportType === 'Table A') {
            const feedbacks = lastFilteredFeedbacks || [];
            let cc1Yes = 0, cc1AwareAfter = 0, cc1No = 0;
            let cc2Easy = 0, cc2Somewhat = 0, cc2Diff = 0, cc2Not = 0;
            let cc3Very = 0, cc3Some = 0, cc3DidNot = 0;
            
            feedbacks.forEach(f => {
                const r = f.ratings || f || {};
                if (r.cc1 === '1') cc1Yes++;
                else if (r.cc1 === '2') cc1AwareAfter++;
                else if (r.cc1 === '3') cc1No++;

                if (r.cc2 === '1') cc2Easy++;
                else if (r.cc2 === '2') cc2Somewhat++;
                else if (r.cc2 === '3') cc2Diff++;
                else if (r.cc2 === '4') cc2Not++;

                if (r.cc3 === '1') cc3Very++;
                else if (r.cc3 === '2') cc3Some++;
                else if (r.cc3 === '3') cc3DidNot++;
            });

            const total = feedbacks.length || 1;
            const pct = (val) => ((val / total) * 100).toFixed(1);

            const subject = `[BISU CSFS] Citizen's Charter Summary Result (Table A) - ${periodStr}`;
            let bodyStr = `BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS\n`;
            bodyStr += `A. CITIZEN'S CHARTER SUMMARY RESULT (TABLE A)\n`;
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Period: ${periodStr}\n`;
            bodyStr += `Total Respondents: ${feedbacks.length}\n`;
            bodyStr += `Generated On: ${new Date().toLocaleString()}\n\n`;
            bodyStr += `CC1. Citizen's Charter Awareness:\n`;
            bodyStr += `- Aware before seeing: ${cc1Yes} (${pct(cc1Yes)}%)\n`;
            bodyStr += `- Aware after seeing: ${cc1AwareAfter} (${pct(cc1AwareAfter)}%)\n`;
            bodyStr += `- Not aware: ${cc1No} (${pct(cc1No)}%)\n\n`;
            bodyStr += `CC2. Citizen's Charter Visibility:\n`;
            bodyStr += `- Easy to see: ${cc2Easy} (${pct(cc2Easy)}%)\n`;
            bodyStr += `- Somewhat easy to see: ${cc2Somewhat} (${pct(cc2Somewhat)}%)\n`;
            bodyStr += `- Difficult to see: ${cc2Diff} (${pct(cc2Diff)}%)\n`;
            bodyStr += `- Not visible: ${cc2Not} (${pct(cc2Not)}%)\n\n`;
            bodyStr += `CC3. Citizen's Charter Helpfulness:\n`;
            bodyStr += `- Helped very much: ${cc3Very} (${pct(cc3Very)}%)\n`;
            bodyStr += `- Helped somewhat: ${cc3Some} (${pct(cc3Some)}%)\n`;
            bodyStr += `- Did not help: ${cc3DidNot} (${pct(cc3DidNot)}%)\n\n`;
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Document Code: F-AQA-CSF-001 | Revision: 03\n`;
            bodyStr += `Bohol Island State University • Quality Management System`;

            return { subject, bodyStr };
        }

        if (reportType === 'Table B') {
            const feedbacks = lastFilteredFeedbacks || [];
            const officeStats = {};
            let overallSum = 0;

            feedbacks.forEach(row => {
                const off = row.office_visited || 'General Office';
                if (!officeStats[off]) {
                    officeStats[off] = { count: 0, meanSum: 0 };
                }
                officeStats[off].count++;
                const score = parseFloat(row.mean_score || 0);
                officeStats[off].meanSum += score;
                overallSum += score;
            });

            const totalCount = feedbacks.length;
            const overallAvg = totalCount > 0 ? (overallSum / totalCount).toFixed(2) : '0.00';
            const overallRatingDesc = getDesc(parseFloat(overallAvg)).toUpperCase();

            let officeLines = '';
            Object.keys(officeStats).forEach(off => {
                const s = officeStats[off];
                const avg = (s.meanSum / s.count).toFixed(2);
                const desc = getDesc(parseFloat(avg)).toUpperCase();
                officeLines += `- ${off}: ${s.count} respondent(s) | Mean: ${avg} / 5.0 (${desc})\n`;
            });

            const subject = `[BISU CSFS] Customer Satisfaction Monthly Rating (Table B) - ${periodStr}`;
            let bodyStr = `BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS\n`;
            bodyStr += `B. CUSTOMER SATISFACTION FEEDBACK MONTHLY RATING (TABLE B)\n`;
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Period: ${periodStr}\n`;
            bodyStr += `Total Respondents: ${totalCount}\n`;
            bodyStr += `Overall Average Rating: ${overallAvg} / 5.0 (${overallRatingDesc})\n`;
            bodyStr += `Generated On: ${new Date().toLocaleString()}\n\n`;
            bodyStr += `OFFICE / UNIT RATINGS BREAKDOWN:\n`;
            bodyStr += officeLines ? officeLines : `No office ratings logged for this period.\n`;
            bodyStr += `\n--------------------------------------------------\n`;
            bodyStr += `Document Code: F-AQA-CSF-001 | Revision: 03\n`;
            bodyStr += `Bohol Island State University • Quality Management System`;

            return { subject, bodyStr };
        }

        if (reportType === 'Table C') {
            const feedbacks = lastFilteredFeedbacks || [];
            let commentsList = '';
            let idx = 1;

            feedbacks.forEach(row => {
                if (row.commendations || row.suggestions) {
                    commentsList += `${idx}. Office: ${row.office_visited || 'General'}\n`;
                    if (row.commendations) commentsList += `   Commendation: ${row.commendations}\n`;
                    if (row.suggestions) commentsList += `   Suggestion/Comment: ${row.suggestions}\n`;
                    commentsList += `   Date: ${new Date(row.created_at).toLocaleString()}\n\n`;
                    idx++;
                }
            });

            const subject = `[BISU CSFS] CSF Commendations and Suggestions (Table C) - ${periodStr}`;
            let bodyStr = `BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS\n`;
            bodyStr += `C. CSF COMMENDATIONS AND SUGGESTIONS (TABLE C)\n`;
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Period: ${periodStr}\n`;
            bodyStr += `Total Submissions with Comments: ${idx - 1}\n`;
            bodyStr += `Generated On: ${new Date().toLocaleString()}\n\n`;
            bodyStr += `COMMENDATIONS & SUGGESTIONS LOG:\n`;
            bodyStr += commentsList ? commentsList : `No commendations or suggestions logged for this period.\n`;
            bodyStr += `--------------------------------------------------\n`;
            bodyStr += `Document Code: F-AQA-CSF-001 | Revision: 03\n`;
            bodyStr += `Bohol Island State University • Quality Management System`;

            return { subject, bodyStr };
        }

        return {
            subject: `[BISU CSFS] Summary Report - ${reportType} (${periodStr})`,
            bodyStr: `BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS\nReport: ${reportType}\nPeriod: ${periodStr}\nGenerated On: ${new Date().toLocaleString()}`
        };
    }

    window.sendReportToService = async function(reportType) {
        if (currentUserRole === 'office') {
            Swal.fire({
                title: 'Office Portal Notice',
                text: 'Forwarding and sending reports via email is reserved for campus quality assurance and administrator accounts. Office portals can view, print, and export reports directly.',
                icon: 'info',
                confirmButtonColor: '#1e1b4b'
            });
            return;
        }

        let inputOptions = {};
        const recipEmails = [];

        if (typeof formConfig !== 'undefined' && Array.isArray(formConfig.recipients)) {
            formConfig.recipients.forEach(r => {
                const parts = r.split('|');
                if (parts.length >= 2) {
                    const label = parts[0].trim();
                    const email = parts[1].trim();
                    inputOptions[email] = `${label} (${email})`;
                    if (email && !recipEmails.includes(email)) recipEmails.push(email);
                } else if (r.trim() !== '') {
                    const email = r.trim();
                    inputOptions[email] = email;
                    if (email && !recipEmails.includes(email)) recipEmails.push(email);
                }
            });
        }

        if (recipEmails.length > 1) {
            inputOptions['__ALL_RECIPIENTS__'] = `📢 Send to All Configured Recipients (${recipEmails.join(', ')})`;
        }

        let allAccounts = [];
        try {
            const client = await getSupabaseClient();
            if (client) {
                const { data: accounts } = await client.from('office_accounts')
                                                       .select('office_name, email')
                                                       .order('office_name', { ascending: true });
                if (accounts && accounts.length > 0) {
                    allAccounts = accounts;
                }
            }
        } catch (e) {
            console.warn('office_accounts fetch error for recipient picker:', e);
        }

        if (allAccounts.length === 0 && typeof getLocalOfficeAccounts === 'function') {
            allAccounts = getLocalOfficeAccounts();
        }

        if (allAccounts && allAccounts.length > 0) {
            allAccounts.forEach(acc => {
                if (acc.email && !inputOptions[acc.email]) {
                    inputOptions[acc.email] = `${acc.office_name} (${acc.email})`;
                }
            });
        }

        if (Object.keys(inputOptions).length === 0) {
            inputOptions[OFFICIAL_FEEDBACK_EMAIL] = `Campus Quality Assurance & Feedback Head (${OFFICIAL_FEEDBACK_EMAIL})`;
        }
        inputOptions['__CUSTOM__'] = '➕ Other / Enter Custom Destination Email...';

        let optionsHtml = '';
        Object.keys(inputOptions).forEach(val => {
            optionsHtml += `<option value="${escapeHtml(val)}">${escapeHtml(inputOptions[val])}</option>`;
        });

        Swal.fire({
            title: `Send ${reportType}`,
            html: `
                <div class="text-left font-sans space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            <i class="fa-solid fa-envelope mr-1 text-bisu-blue"></i> Destination Recipient
                        </label>
                        <select id="swal-dispatch-recipient" class="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl focus:ring-1 focus:ring-bisu-blue focus:border-bisu-blue block p-3 font-medium outline-none cursor-pointer">
                            ${optionsHtml}
                        </select>
                    </div>

                    <div id="swal-custom-email-wrap" class="hidden">
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            <i class="fa-solid fa-at mr-1 text-bisu-blue"></i> Custom Email Address
                        </label>
                        <input type="email" id="swal-custom-email" placeholder="e.g. director.qa@bisu.edu.ph" class="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl focus:ring-1 focus:ring-bisu-blue focus:border-bisu-blue block p-3 outline-none" />
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            <i class="fa-solid fa-file-export mr-1 text-bisu-blue"></i> Choose Document Format to Send
                        </label>
                        <div class="grid grid-cols-2 gap-2.5">
                            <label id="label-format-pdf" class="flex items-center gap-2.5 p-3 rounded-xl border-2 border-rose-500 bg-rose-50/70 text-slate-800 cursor-pointer transition select-none shadow-2xs">
                                <input type="radio" name="swal-dispatch-format" value="pdf" checked class="text-rose-600 focus:ring-rose-500" />
                                <div class="min-w-0 text-left">
                                    <span class="font-extrabold text-xs text-rose-950 block"><i class="fa-solid fa-file-pdf text-rose-600 mr-1"></i> PDF (.pdf)</span>
                                    <span class="text-[10px] text-slate-500 font-medium block">Standard Document</span>
                                </div>
                            </label>

                            <label id="label-format-docx" class="flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-800 cursor-pointer transition select-none hover:border-blue-300">
                                <input type="radio" name="swal-dispatch-format" value="docx" class="text-blue-600 focus:ring-blue-500" />
                                <div class="min-w-0 text-left">
                                    <span class="font-extrabold text-xs text-slate-900 block"><i class="fa-solid fa-file-word text-blue-600 mr-1"></i> Word (.docx)</span>
                                    <span class="text-[10px] text-slate-500 font-medium block">Editable Document</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div class="bg-blue-50/80 border border-blue-200/80 rounded-xl p-2.5 text-[11px] text-blue-900 flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-bisu-blue text-sm shrink-0"></i>
                        <span>Sender: <b>${OFFICIAL_FEEDBACK_EMAIL}</b></span>
                    </div>
                </div>
            `,
            iconHtml: '<div class="w-14 h-14 bg-blue-50 text-bisu-blue rounded-full flex items-center justify-center mx-auto mb-1 shadow-sm border border-blue-100"><i class="fa-solid fa-paper-plane text-xl"></i></div>',
            customClass: {
                icon: 'border-0 mb-0 w-full',
                popup: 'rounded-3xl shadow-2xl font-sans pb-5 border border-slate-100 max-w-md',
                title: 'text-xl font-black text-slate-800 tracking-tight mt-1',
                actions: 'w-full flex justify-center gap-3 mt-4',
                confirmButton: 'bg-bisu-blue hover:bg-bisu-blue-dark text-white font-bold rounded-xl px-7 py-3 shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer',
                cancelButton: 'bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-5 py-3 transition-all border border-slate-200 text-xs shadow-2xs cursor-pointer',
            },
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> Send Report',
            cancelButtonText: 'Cancel',
            didOpen: () => {
                const selectEl = document.getElementById('swal-dispatch-recipient');
                const customWrap = document.getElementById('swal-custom-email-wrap');
                const pdfLabel = document.getElementById('label-format-pdf');
                const docxLabel = document.getElementById('label-format-docx');
                const formatRadios = document.querySelectorAll('input[name="swal-dispatch-format"]');

                if (selectEl && customWrap) {
                    selectEl.addEventListener('change', () => {
                        if (selectEl.value === '__CUSTOM__') {
                            customWrap.classList.remove('hidden');
                            document.getElementById('swal-custom-email')?.focus();
                        } else {
                            customWrap.classList.add('hidden');
                        }
                    });
                }

                formatRadios.forEach(radio => {
                    radio.addEventListener('change', () => {
                        if (radio.value === 'pdf') {
                            pdfLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-rose-500 bg-rose-50/70 text-slate-800 cursor-pointer transition select-none shadow-2xs';
                            docxLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-800 cursor-pointer transition select-none hover:border-blue-300';
                        } else {
                            docxLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-blue-500 bg-blue-50/70 text-slate-800 cursor-pointer transition select-none shadow-2xs';
                            pdfLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-800 cursor-pointer transition select-none hover:border-rose-300';
                        }
                    });
                });
            },
            preConfirm: () => {
                const selectEl = document.getElementById('swal-dispatch-recipient');
                const customInput = document.getElementById('swal-custom-email');
                const selectedFormat = document.querySelector('input[name="swal-dispatch-format"]:checked')?.value || 'pdf';

                if (!selectEl) return false;
                let chosenRecipient = selectEl.value;

                if (chosenRecipient === '__CUSTOM__') {
                    const customVal = (customInput?.value || '').trim();
                    if (!customVal || !customVal.includes('@')) {
                        Swal.showValidationMessage('Please enter a valid email address.');
                        return false;
                    }
                    chosenRecipient = customVal;
                } else if (chosenRecipient === '__ALL_RECIPIENTS__') {
                    chosenRecipient = recipEmails.join(', ');
                }

                return { recipient: chosenRecipient, format: selectedFormat };
            }
        }).then((result) => {
            if (!result.isConfirmed || !result.value) return;

            const { recipient, format } = result.value;
            const reportData = getReportEmailData(reportType);
            const safeReportType = (reportType || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
            const customFilename = `BISU_${safeReportType}_Record`;

            forwardEmailReport(recipient, reportData.subject, reportData.bodyStr, null, customFilename, format);
        });
    };

    // Views
    const privacyModal = document.getElementById('privacy-modal');
    const viewFeedback = document.getElementById('view-feedback');
    const viewComplaint = document.getElementById('view-complaint');
    const viewAdmin = document.getElementById('view-admin');
    function showDefaultView(updateRoute = true) {
        if (viewFeedback) viewFeedback.classList.remove('section-hidden');
        if (viewComplaint) viewComplaint.classList.add('section-hidden');
        if (viewAdmin) viewAdmin.classList.add('section-hidden');
        if (updateRoute && typeof syncUrlRoute === 'function') {
            syncUrlRoute('feedback');
        }
    }

    // Always start from the public feedback form on a normal page load.
    // Route-specific handlers below can still switch to complaint/admin views when needed.
    showDefaultView(false);

    // Admin Login Modal
    const adminLoginModal = document.getElementById('admin-login-modal');
    const closeLoginBtn = document.getElementById('close-login-btn');
    const adminLoginForm = document.getElementById('admin-login-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const submitLoginBtn = document.getElementById('submit-login-btn');

    // Admin Account Management Modal
    const manageAccountsBtn = document.getElementById('manage-accounts-btn');
    const manageAccountsModal = document.getElementById('manage-accounts-modal');
    const closeAccountsBtn = document.getElementById('close-accounts-btn');
    const officeAccountForm = document.getElementById('office-account-form');
    const accOfficeSelect = document.getElementById('acc-office');
    const accEmailInput = document.getElementById('acc-email');
    const accPasswordInput = document.getElementById('acc-password');
    const submitAccBtn = document.getElementById('submit-acc-btn');
    const accountsTableBody = document.getElementById('accounts-table-body');
    const settingsBtn = document.getElementById('admin-settings-btn');

    // Manage Recipients Modal
    const manageRecipientsBtn = document.getElementById('manage-recipients-btn');
    const manageRecipientsModal = document.getElementById('manage-recipients-modal');
    const closeRecipientsBtn = document.getElementById('close-recipients-btn');
    const saveRecipientsBtn = document.getElementById('save-recipients-btn');
    const configRecipientsList = document.getElementById('config-recipients-list');
    const addRecipientBtn = document.getElementById('add-recipient-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportDocxBtn = document.getElementById('export-docx-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const archiveDataBtn = document.getElementById('archive-data-btn');
    
    let tempRecipients = [];
    let lastFetchedFeedbacks = [];
    let lastFetchedComplaints = [];
    let lastFilteredFeedbacks = [];
    let lastFilteredComplaints = [];
    let currentUserRole = 'super_admin'; // 'super_admin' or 'office'
    let currentOfficeScope = null; // null for super_admin, or office name string like 'Library'
    
    function renderRecipientsList() {
        if (!configRecipientsList) return;
        configRecipientsList.innerHTML = '';
        tempRecipients.forEach((recip, idx) => {
            const div = document.createElement('div');
            div.className = 'bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative transition-all hover:border-blue-300';
            div.innerHTML = `
                <button type="button" class="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition cursor-pointer" onclick="removeTempRecipient(${idx})" title="Remove"><i class="fa-solid fa-trash"></i></button>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mr-6">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Office / Title</label>
                        <input type="text" value="${escapeHtml(recip.name)}" oninput="updateTempRecipient(${idx}, 'name', this.value)" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-bisu-blue focus:ring-1 focus:ring-bisu-blue outline-none transition-shadow bg-white" placeholder="e.g. Campus Quality Assurance">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address (Gmail / Institutional)</label>
                        <input type="email" value="${escapeHtml(recip.email)}" oninput="updateTempRecipient(${idx}, 'email', this.value)" class="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-bisu-blue focus:ring-1 focus:ring-bisu-blue outline-none transition-shadow bg-white font-medium" placeholder="e.g. fredianmherl.masas@bisu.edu.ph">
                    </div>
                </div>
            `;
            configRecipientsList.appendChild(div);
        });
        
        if (tempRecipients.length === 0) {
            configRecipientsList.innerHTML = '<div class="text-center py-6 text-slate-400 italic text-sm">No custom recipients added.</div>';
        }
    }

    if (addRecipientBtn) {
        addRecipientBtn.addEventListener('click', () => {
            tempRecipients.push({ name: '', email: '' });
            renderRecipientsList();
            setTimeout(() => {
                const list = configRecipientsList;
                if(list) list.scrollTop = list.scrollHeight;
            }, 50);
        });
    }

    window.updateTempRecipient = function(idx, field, val) {
        tempRecipients[idx][field] = val;
    };

    window.removeTempRecipient = function(idx) {
        tempRecipients.splice(idx, 1);
        renderRecipientsList();
    };

    // Consent
    const consentCheckbox = document.getElementById('consent-checkbox');
    const acceptConsentBtn = document.getElementById('accept-consent-btn');

    const toggleComplaintBtn = document.getElementById('toggle-complaint-btn');
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    const clearFeedbackBtn = document.getElementById('clear-feedback-btn');
    const clearComplaintBtn = document.getElementById('clear-complaint-btn');
    const backToFeedbackBtn = document.getElementById('back-to-feedback-btn');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginBtnMobile = document.getElementById('admin-login-btn-mobile');
    const logoutAdminBtn = document.getElementById('logout-admin-btn');
    
    // Forms
    const feedbackForm = document.getElementById('feedback-form');
    const complaintForm = document.getElementById('complaint-form');

    // State Variables
    // currentRatings is defined dynamically below

    // === Translations ===
    let currentLang = 'en';

    const translations = {
        en: {
            "t-header-sub": "Calape Campus - Customer Satisfaction",
            "t-modal-title": "Data Privacy Act Consent",
            "t-modal-desc": "In accordance with the Data Privacy Act of 2012, we ensure that your personal data is protected. The information gathered will be used solely for evaluating and improving our services.",
            "t-modal-check": "I agree to the terms and authorize BISU to process my feedback.",
            "t-modal-btn": "Proceed to Form",
            "t-fb-title": "Feedback Form",
            "t-fb-name": `Name <span class="text-[10px] text-slate-400 font-normal italic">(Opt)</span>`,
            "t-fb-email": `Email Address <span class="text-[10px] text-slate-400 font-normal italic">(Opt - for copy)</span>`,
            "t-fb-office": `Office Visited <span class="text-red-500">*</span>`,
            "t-sel-office": "Select Office",
            "t-fb-service": `Service Availed <span class="text-red-500">*</span>`,
            "t-sel-service": "Select Service",
            "t-fb-type": `Client Type <span class="text-red-500">*</span>`,
            "t-sel-type": "Select Type",
            "t-type-stu": "Student",
            "t-type-fac": "Faculty",
            "t-type-cit": "Citizen",
            "t-type-bus": "Business",
            "t-type-gov": "Government",
            "t-fb-sex": "Gender (Optional)",
            "t-fb-region": "Region of Residence (Optional)",
            "t-fb-served": "Served By (Optional)",
            "t-sel-sex": "Select Gender",
            "t-sel-region": "Select Region",
            "t-sex-m": "Male",
            "t-sex-f": "Female",
            "t-sex-o": "Prefer not to say",
            "t-fb-inst-strong": "Rating Scale:",
            "t-fb-vs1": "Very Satisfied",
            "t-fb-sat": "Satisfied",
            "t-fb-neu": "Neutral",
            "t-fb-dis": "Dissatisfied",
            "t-fb-vd1": "Very Dissatisfied",
            "t-fb-na": "Not Applicable",
            "t-fb-commend": "Commendations (Optional)",
            "t-fb-suggest": "Suggestions (Optional)",
            "t-fb-comp-link": "File a Formal Complaint instead",
            "t-fb-submit": "Submit Feedback",
            "t-cp-title": "Formal Complaint Form",
            "t-cp-back": "Back",
            "t-cp-desc": "This form is given to any client experiencing dissatisfaction. Data is handled with strict confidentiality per the Data Privacy Act.",
            "t-cp-h1": "Details of Complainant (Optional for anonymity)",
            "t-cp-name": "Name",
            "t-cp-contact": "Contact Details",
            "t-cp-h2": "Complaint Details",
            "t-cp-date": `Date of Incident <span class="text-red-500">*</span>`,
            "t-cp-place": `Place of Incident <span class="text-red-500">*</span>`,
            "t-cp-act": `Act/s Complained of / Details <span class="text-red-500">*</span>`,
            "t-cp-narr": `Narrative Report <span class="text-red-500">*</span>`,
            "t-cp-out": `Desired Outcome <span class="text-red-500">*</span>`,
            "t-cp-bind": "I bind myself to stand on the truth of this complaint on behalf of the public and the institution.",
            "t-cp-submit": "Submit Complaint",
            "t-cc-title": "Citizen's Charter (CC)",
            "t-cc-desc": "The Citizen's Charter is an official document that reflects the services of a government agency/office including its requirements, fees, and processing time among others.",
            "t-cc1-label": `CC1. Which of the following best describes your awareness of a CC? <span class="text-red-500">*</span>`,
            "t-cc1-opt1": "1. I know what a CC is and I saw this office's CC.",
            "t-cc1-opt2": "2. I know what a CC is but I did not see this office's CC.",
            "t-cc1-opt3": "3. I learned of the CC only when I saw this office's CC.",
            "t-cc1-opt4": "4. I do not know what a CC is and I did not see one in this office.",
            "t-cc2-label": `CC2. Would you say that the CC of this office was <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>? <span class="text-red-500">*</span>`,
            "t-cc2-sel": "Select Response",
            "t-cc2-opt1": "1. Easy to see",
            "t-cc2-opt2": "2. Somewhat easy to see",
            "t-cc2-opt3": "3. Difficult to see",
            "t-cc2-opt4": "4. Not visible at all",
            "t-cc2-opt5": "5. N/A",
            "t-cc3-label": `CC3. How much did the CC help you in your transaction? <span class="text-red-500">*</span>`,
            "t-cc3-sel": "Select Response",
            "t-cc3-opt1": "Helped very much",
            "t-cc3-opt2": "Somewhat helped",
            "t-cc3-opt3": "Did not help",
            "t-cc3-opt4": "N/A",
            "t-thank-title": "Thank you for your feedback!!",
            "t-thank-desc": "Your feedback has been successfully submitted and recorded.",
            "t-thank-sub": "Thank you for taking the time to help us enhance the quality and delivery of services at Bohol Island State University.",
            "t-thank-btn-done": "Done",
            "t-thank-btn-another": "Submit Another Feedback",
            "t-fb-date": `Date <span class="text-red-500">*</span>`,
            "t-fb-time": `Time <span class="text-red-500">*</span>`,
            "t-email-ask": "Would you like to email a copy of your response?",
            "t-email-opt-yes": "Yes, email my copy",
            "t-email-opt-no": "No, thanks",
            "t-email-placeholder": "Enter your email address...",
            "t-email-send-btn": "Send Email Receipt",
            "t-email-copy-btn": "Copy Summary Text",
            "t-email-success-open": "Opening your email application with your feedback receipt...",
            "t-email-copied": "Response summary copied to clipboard!",
            "t-email-invalid": "Please enter a valid email address."
        },
        tl: {
            "t-header-sub": "Kampus ng Calape - Kasiyahan ng Kostumer",
            "t-modal-title": "Pahintulot sa Data Privacy Act",
            "t-modal-desc": "Alinsunod sa Data Privacy Act ng 2012, tinitiyak namin na protektado ang iyong personal na data. Ang impormasyong nakalap ay gagamitin lamang para sa pagtatasa at pagpapabuti ng aming mga serbisyo.",
            "t-modal-check": "Sumasang-ayon ako sa mga tuntunin at pinahihintulutan ang BISU na iproseso ang aking feedback.",
            "t-modal-btn": "Magpatuloy sa Form",
            "t-fb-title": "Form ng Feedback",
            "t-fb-name": "Pangalan (Opsyonal)",
            "t-fb-email": "Email Address (Opsyonal - para sa kopya)",
            "t-fb-office": `Opisinang Binisita <span class="text-red-500">*</span>`,
            "t-sel-office": "Pumili ng Opisina",
            "t-fb-service": `Serbisyong Nakuha <span class="text-red-500">*</span>`,
            "t-sel-service": "Pumili ng Serbisyo",
            "t-fb-type": `Uri ng Kliyente <span class="text-red-500">*</span>`,
            "t-sel-type": "Pumili ng Uri",
            "t-type-stu": "Estudyante",
            "t-type-fac": "Guro",
            "t-type-cit": "Mamamayan",
            "t-type-bus": "Negosyo",
            "t-type-gov": "Gobyerno",
            "t-fb-sex": "Kasarian (Opsyonal)",
            "t-fb-region": "Rehiyon ng Tirahan (Opsyonal)",
            "t-fb-served": "Nagsilbi (Opsyonal)",
            "t-sel-sex": "Pumili ng Kasarian",
            "t-sel-region": "Pumili ng Rehiyon",
            "t-sex-m": "Lalaki",
            "t-sex-f": "Babae",
            "t-sex-o": "Mas piniling hindi sabihin",
            "t-fb-inst-strong": "Sukat ng Pag-rate:",
            "t-fb-vs1": "Lubos na Nasiyahan",
            "t-fb-sat": "Nasiyahan",
            "t-fb-neu": "Neutral",
            "t-fb-dis": "Hindi Nasiyahan",
            "t-fb-vd1": "Lubos na Hindi Nasiyahan",
            "t-fb-na": "Hindi Naaangkop",
            "t-fb-commend": "Papuri (Opsyonal)",
            "t-fb-suggest": "Mungkahi (Opsyonal)",
            "t-fb-comp-link": "Maghain ng Pormal na Reklamo",
            "t-fb-submit": "Isumite ang Feedback",
            "t-cp-title": "Pormal na Form ng Reklamo",
            "t-cp-back": "Bumalik",
            "t-cp-desc": "Ang form na ito ay ibinibigay sa sinumang kliyente na nakakaranas ng hindi kasiyahan. Ang data ay hahawakan nang may mahigpit na pagiging lihim base sa Data Privacy Act.",
            "t-cp-h1": "Mga Detalye ng Nagrereklamo (Opsyonal para hindi makilala)",
            "t-cp-name": "Pangalan",
            "t-cp-contact": "Mga Detalye sa Pakikipag-ugnayan",
            "t-cp-h2": "Mga Detalye ng Reklamo",
            "t-cp-date": `Petsa ng Insidente <span class="text-red-500">*</span>`,
            "t-cp-place": `Lugar ng Insidente <span class="text-red-500">*</span>`,
            "t-cp-act": `Gawaing Inirereklamo <span class="text-red-500">*</span>`,
            "t-cp-narr": `Salaysay na Ulat <span class="text-red-500">*</span>`,
            "t-cp-out": `Nais na Kalabasan <span class="text-red-500">*</span>`,
            "t-cp-bind": "Tinatali ko ang aking sarili na panindigan ang katotohanan ng reklamong ito.",
            "t-cp-submit": "Isumite ang Reklamo",
            "t-cc-title": "Citizen's Charter (CC)",
            "t-cc-desc": "Ang Citizen's Charter ay isang opisyal na dokumento na sumasalamin sa mga serbisyo ng isang ahensya o tanggapan ng pamahalaan kasama ang mga kinakailangan, bayarin, at oras ng pagproseso.",
            "t-cc1-label": `CC1. Alin sa mga sumusunod ang pinakamahusay na naglalarawan sa iyong kamalayan sa CC? <span class="text-red-500">*</span>`,
            "t-cc1-opt1": "1. Alam ko kung ano ang CC at nakita ko ang CC ng opisinang ito.",
            "t-cc1-opt2": "2. Alam ko kung ano ang CC ngunit hindi ko nakita ang CC ng opisinang ito.",
            "t-cc1-opt3": "3. Nalaman ko ang tungkol sa CC nang makita ko ang CC ng opisinang ito.",
            "t-cc1-opt4": "4. Hindi ko alam kung ano ang CC at hindi ko nakita ang isa sa opisinang ito.",
            "t-cc2-label": `CC2. Masasabi mo ba na ang CC ng opisinang ito ay <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>? <span class="text-red-500">*</span>`,
            "t-cc2-sel": "Pumili ng Tugon",
            "t-cc2-opt1": "1. Madaling makita",
            "t-cc2-opt2": "2. Medyo madaling makita",
            "t-cc2-opt3": "3. Mahirap makita",
            "t-cc2-opt4": "4. Hindi nakikita",
            "t-cc2-opt5": "5. N/A",
            "t-cc3-label": `CC3. Gaano kalaki ang naitulong sa iyo ng CC sa iyong transaksyon? <span class="text-red-500">*</span>`,
            "t-cc3-sel": "Pumili ng Tugon",
            "t-cc3-opt1": "Malaki ang naitulong",
            "t-cc3-opt2": "Medyo nakatulong",
            "t-cc3-opt3": "Hindi nakatulong",
            "t-cc3-opt4": "N/A",
            "t-thank-title": "Maraming salamat sa iyong feedback!!",
            "t-thank-desc": "Matagumpay na naitala at naisumite ang iyong feedback.",
            "t-thank-sub": "Salamat sa paglalaan ng oras upang tulungan kaming mapabuti ang kalidad ng mga serbisyo sa Bohol Island State University.",
            "t-thank-btn-done": "Tapos Na",
            "t-thank-btn-another": "Magsumite ng Isa Pa",
            "t-fb-date": `Petsa <span class="text-red-500">*</span>`,
            "t-fb-time": `Oras <span class="text-red-500">*</span>`,
            "t-email-ask": "Nais mo bang i-email ang kopya ng iyong tugon?",
            "t-email-opt-yes": "Oo, i-email ang kopya",
            "t-email-opt-no": "Hindi na, salamat",
            "t-email-placeholder": "Ilagay ang iyong email address...",
            "t-email-send-btn": "Ipadala ang Resibo sa Email",
            "t-email-copy-btn": "Kopyahin ang Buod",
            "t-email-success-open": "Binubuksan ang iyong email app kasama ang resibo ng feedback...",
            "t-email-copied": "Nakopya ang buod ng tugon sa clipboard!",
            "t-email-invalid": "Mangyaring maglagay ng wastong email address."
        },
        ceb: {
            "t-header-sub": "Kampus sa Calape - Katagbawan sa Kustomer",
            "t-modal-title": "Pagtugot sa Data Privacy Act",
            "t-modal-desc": "Nahiuyon sa Data Privacy Act sa 2012, among gipaninguha nga protektado ang imong personal nga datos. Ang impormasyon pagagamiton para lang sa pagpalambo sa serbisyo.",
            "t-modal-check": "Miuyon ako sa mga kondisyon ug gitugotan ang BISU sa pagproseso sa akong feedback.",
            "t-modal-btn": "Ipadayon sa Porma",
            "t-fb-title": "Porma sa Feedback",
            "t-fb-name": "Pangalan (Opsiyonal)",
            "t-fb-email": "Email Address (Opsiyonal - para sa kopya)",
            "t-fb-office": `Opisina nga Gibisita <span class="text-red-500">*</span>`,
            "t-sel-office": "Pagpili og Opisina",
            "t-fb-service": `Serbisyo nga Nakuha <span class="text-red-500">*</span>`,
            "t-sel-service": "Pagpili og Serbisyo",
            "t-fb-type": `Klase sa Kliyente <span class="text-red-500">*</span>`,
            "t-sel-type": "Pagpili og Klase",
            "t-type-stu": "Estudyante",
            "t-type-fac": "Magtutudlo",
            "t-type-cit": "Lungsoranon",
            "t-type-bus": "Pamatigayon",
            "t-type-gov": "Gobyerno",
            "t-fb-sex": "Kasarian (Opsiyonal)",
            "t-fb-region": "Rehiyon sa Puloy-anan (Opsiyonal)",
            "t-fb-served": "Nag-alagad (Opsiyonal)",
            "t-sel-sex": "Pagpili og Kasarian",
            "t-sel-region": "Pagpili og Rehiyon",
            "t-sex-m": "Lalaki",
            "t-sex-f": "Babaye",
            "t-sex-o": "Mas gipili nga dili isulti",
            "t-fb-inst-strong": "Sukdanan sa Rating:",
            "t-fb-vs1": "Kontento Kaayo",
            "t-fb-sat": "Kontento",
            "t-fb-neu": "Neyutral",
            "t-fb-dis": "Dili Kontento",
            "t-fb-vd1": "Dili Kontento Kaayo",
            "t-fb-na": "Walay Mabutang",
            "t-fb-commend": "Pagdayeg (Opsiyonal)",
            "t-fb-suggest": "Suhisyon (Opsiyonal)",
            "t-fb-comp-link": "Pag-file og Pormal nga Reklamo",
            "t-fb-submit": "I-sumiter ang Feedback",
            "t-cp-title": "Pormal nga Porma sa Reklamo",
            "t-cp-back": "Balik",
            "t-cp-desc": "Kini nga porma gihatag ngadto sa bisan kinsa nga kliyente nga nakasinati og pagkadili kontento. Ang datos atimanon uban ang higpit nga kompidensiyalidad basi sa Data Privacy Act.",
            "t-cp-h1": "Mga Detalye sa Reklamante (Pwede dili magpaila)",
            "t-cp-name": "Pangalan",
            "t-cp-contact": "Contact Details",
            "t-cp-h2": "Mga Detalye sa Reklamo",
            "t-cp-date": `Adlaw sa Insidente <span class="text-red-500">*</span>`,
            "t-cp-place": `Lugar sa Insidente <span class="text-red-500">*</span>`,
            "t-cp-act": `Aksyon nga Gireklamo <span class="text-red-500">*</span>`,
            "t-cp-narr": `Naratibong Report <span class="text-red-500">*</span>`,
            "t-cp-out": `Gitinguha nga Resulta <span class="text-red-500">*</span>`,
            "t-cp-bind": "Gibarugan nako ang kamatuoran niining reklamo alang sa publiko ug institusyon.",
            "t-cp-submit": "I-sumiter ang Reklamo",
            "t-cc-title": "Citizen's Charter (CC)",
            "t-cc-desc": "Ang Citizen's Charter usa ka opisyal nga dokumento nga nagpakita sa mga serbisyo sa ahensya o opisina sa gobyerno lakip ang mga kinahanglanon, bayranan, ug oras sa pagproseso.",
            "t-cc1-label": `CC1. Hain sa mosunod ang labing naghulagway sa imong kahibalo sa CC? <span class="text-red-500">*</span>`,
            "t-cc1-opt1": "1. Nahibalo ko kung unsa ang CC ug nakita nako ang CC niini nga opisina.",
            "t-cc1-opt2": "2. Nahibalo ko kung unsa ang CC apan wala nako nakita ang CC niini nga opisina.",
            "t-cc1-opt3": "3. Nahibal-an nako ang bahin sa CC sa dihang nakita nako ang CC niini nga opisina.",
            "t-cc1-opt4": "4. Wala ko nahibalo kung unsa ang CC ug wala ako nakakita niini sa maong opisina.",
            "t-cc2-label": `CC2. Makaingon ba ka nga ang CC niini nga opisina <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>? <span class="text-red-500">*</span>`,
            "t-cc2-sel": "Pagpili og Tubag",
            "t-cc2-opt1": "1. Sayon makita",
            "t-cc2-opt2": "2. Medyo sayon makita",
            "t-cc2-opt3": "3. Lisod makita",
            "t-cc2-opt4": "4. Wala gyud makita",
            "t-cc2-opt5": "5. N/A",
            "t-cc3-label": `CC3. Unsa kadako ang natabang sa CC sa imong transaksyon? <span class="text-red-500">*</span>`,
            "t-cc3-sel": "Pagpili og Tubag",
            "t-cc3-opt1": "Dako kaayog natabang",
            "t-cc3-opt2": "Medyo nakatabang",
            "t-cc3-opt3": "Wala nakatabang",
            "t-cc3-opt4": "N/A",
            "t-thank-title": "Daghang salamat sa imong feedback!!",
            "t-thank-desc": "Malamapuson nga narekord ug na-sumite ang imong feedback.",
            "t-thank-sub": "Salamat sa imong panahon sa pagtabang kanamo nga mapalambo ang kalidad sa mga serbisyo sa Bohol Island State University.",
            "t-thank-btn-done": "Nahuman Na",
            "t-thank-btn-another": "Mopadala og Lain",
            "t-fb-date": `Petsa <span class="text-red-500">*</span>`,
            "t-fb-time": `Oras <span class="text-red-500">*</span>`,
            "t-email-ask": "Gusto ba nimong i-email ang kopya sa imong tubag?",
            "t-email-opt-yes": "Oo, i-email akong kopya",
            "t-email-opt-no": "Dili na, salamat",
            "t-email-placeholder": "Ibutang ang imong email address...",
            "t-email-send-btn": "Ipadala ang Resibo sa Email",
            "t-email-copy-btn": "Kopyaha ang Sumaryo",
            "t-email-success-open": "Giablihan ang imong email app uban ang resibo sa feedback...",
            "t-email-copied": "Nakopya ang sumaryo sa tubag sa clipboard!",
            "t-email-invalid": "Palihug pagsulod og balido nga email address."
        }
    };

    const defaultDimensions = {
        en: [
            { id: 'responsiveness', icon: 'fa-bolt', label: '1. Responsiveness', desc: 'Willingness to help, assist, and provide prompt service.' },
            { id: 'reliability', icon: 'fa-shield-halved', label: '2. Reliability (Quality)', desc: 'Provision of what is needed and what was promised.' },
            { id: 'access_facilities', icon: 'fa-building', label: '3. Access & Facilities', desc: 'Convenience of location, ample amenities, and clean space.' },
            { id: 'communication', icon: 'fa-comments', label: '4. Communication', desc: 'Act of keeping citizens and clients informed in a language they can easily understand.' },
            { id: 'costs', icon: 'fa-wallet', label: '5. Costs', desc: 'Satisfaction with timeliness of the billing, fair value, etc.' },
            { id: 'integrity', icon: 'fa-scale-balanced', label: '6. Integrity', desc: 'Honesty, justice, fairness, and trust in the service.' },
            { id: 'assurance', icon: 'fa-handshake', label: '7. Assurance', desc: 'Capability of frontline staff to perform their duties with courtesy.' },
            { id: 'outcome', icon: 'fa-bullseye', label: '8. Outcome', desc: 'Extent of achieving outcomes or realizing the intended benefits.' }
        ],
        tl: [
            { id: 'responsiveness', icon: 'fa-bolt', label: '1. Pagtugon (Responsiveness)', desc: 'Kusang loob na tumulong at magbigay ng mabilis na serbisyo.' },
            { id: 'reliability', icon: 'fa-shield-halved', label: '2. Kaaasahan (Reliability)', desc: 'Pagbibigay ng kung ano ang kinakailangan at ipinangako.' },
            { id: 'access_facilities', icon: 'fa-building', label: '3. Pasilidad at Access', desc: 'Kaginhawaan sa lokasyon at malinis na espasyo.' },
            { id: 'communication', icon: 'fa-comments', label: '4. Komunikasyon', desc: 'Pagpapanatiling may alam ang mga kliyente sa wikang madaling maintindihan.' },
            { id: 'costs', icon: 'fa-wallet', label: '5. Gastos', desc: 'Kasiyahan sa halaga, oras ng pagsingil, atbp.' },
            { id: 'integrity', icon: 'fa-scale-balanced', label: '6. Integridad (Integrity)', desc: 'Katapatan, katarungan, at tiwala sa serbisyo.' },
            { id: 'assurance', icon: 'fa-handshake', label: '7. Kasiguruhan (Assurance)', desc: 'Kakayahan ng mga kawani na gampanan ang tungkulin nang may paggalang.' },
            { id: 'outcome', icon: 'fa-bullseye', label: '8. Kinalabasan (Outcome)', desc: 'Lawak ng pagkamit ng mga inaasahang benepisyo.' }
        ],
        ceb: [
            { id: 'responsiveness', icon: 'fa-bolt', label: '1. Pagtubag (Responsiveness)', desc: 'Kadasig sa pag-abag ug paghatag og paspas nga serbisyo.' },
            { id: 'reliability', icon: 'fa-shield-halved', label: '2. Kasaligan (Reliability)', desc: 'Paghatag unsa ang gikinahanglan ug unsa ang gisaad.' },
            { id: 'access_facilities', icon: 'fa-building', label: '3. Pasilidad ug Access', desc: 'Kasayon sa lokasyon ug komportable nga lugar.' },
            { id: 'communication', icon: 'fa-comments', label: '4. Komunikasyon', desc: 'Ang pagpahibalo sa impormasyon ngadto sa kliyente pinaagi sa dali masabtan nga pinulongan.' },
            { id: 'costs', icon: 'fa-wallet', label: '5. Gasto', desc: 'Pagkakontento sa pangayo ug uban pa.' },
            { id: 'integrity', icon: 'fa-scale-balanced', label: '6. Integridad (Integrity)', desc: 'Pagkamatinud-anon ug pagkamakatarunganon sa serbisyo.' },
            { id: 'assurance', icon: 'fa-handshake', label: '7. Kasigurohan (Assurance)', desc: 'Kahanas sa mga kawani sa pagbuhat sa ilang trabaho uban ang tahod.' },
            { id: 'outcome', icon: 'fa-bullseye', label: '8. Resulta (Outcome)', desc: 'Ang gidak-on sa nakamit nga gipaabot nga kaayohan.' }
        ]
    };

    const ratingValues = [
        { value: 5, text: '5', label: 'Very Satisfied', colorClass: 'hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50' },
        { value: 4, text: '4', label: 'Satisfied', colorClass: 'hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50' },
        { value: 3, text: '3', label: 'Neutral', colorClass: 'hover:border-slate-400 hover:text-slate-600 hover:bg-slate-100' },
        { value: 2, text: '2', label: 'Dissatisfied', colorClass: 'hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50' },
        { value: 1, text: '1', label: 'Very Dissatisfied', colorClass: 'hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50' },
        { value: 0, text: 'N/A', label: 'Not Applicable', colorClass: 'hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50' }
    ];

    // === Dynamic Form Config ===
    const getDefaultFormConfig = () => ({
        offices: ["Registrar's Office", "Cashier", "Library", "Clinic", "Guidance Office"],
        recipients: ["Campus Quality Assurance & Feedback Head | fredianmherl.masas@bisu.edu.ph"],
        dimensions: JSON.parse(JSON.stringify(defaultDimensions))
    });

    const normalizeFormConfig = (config) => {
        const normalized = config || {};
        if (!Array.isArray(normalized.offices) || normalized.offices.length === 0) {
            normalized.offices = getDefaultFormConfig().offices;
        }

        if (!Array.isArray(normalized.recipients) || normalized.recipients.length === 0) {
            normalized.recipients = getDefaultFormConfig().recipients;
        } else {
            // Automatically upgrade legacy placeholder qa@bisu.edu.ph to user specified admin email
            normalized.recipients = normalized.recipients.map(r => {
                if (typeof r === 'string' && r.includes('qa@bisu.edu.ph')) {
                    return r.replace('qa@bisu.edu.ph', 'fredianmherl.masas@bisu.edu.ph');
                }
                return r;
            });
        }

        if (!normalized.dimensions || typeof normalized.dimensions !== 'object') {
            normalized.dimensions = JSON.parse(JSON.stringify(defaultDimensions));
        }

        ['en', 'tl', 'ceb'].forEach(lang => {
            if (!Array.isArray(normalized.dimensions[lang]) || normalized.dimensions[lang].length === 0) {
                normalized.dimensions[lang] = JSON.parse(JSON.stringify(defaultDimensions[lang]));
            }
        });

        return normalized;
    };

    let formConfig = normalizeFormConfig(JSON.parse(localStorage.getItem('bisuFormConfig')) || getDefaultFormConfig());

    const servicesByOffice = {
        "Registrar's Office": [
            "Enrollment / Registration",
            "Request for Transcript of Records (TOR)",
            "Request for Certifications (Grades, Graduation, Enrollment)",
            "Diploma Release",
            "Evaluation of Grades"
        ],
        "Cashier": [
            "Tuition / Fees Payment",
            "Document Fee Payment (TOR, Certifications)",
            "Refund Claim"
        ],
        "Library": [
            "Book Borrowing / Returning",
            "Signing of Clearance",
            "Library Card Application / Renewal",
            "Research / Study Area Use"
        ],
        "Clinic": [
            "Medical / Dental Consultation",
            "Medicine Issuance",
            "Medical Certificate Processing",
            "First Aid Treatment"
        ],
        "Guidance Office": [
            "Counseling Session",
            "Good Moral Certificate Request",
            "Admission / Testing Support",
            "Career Guidance / Orientation"
        ]
    };

    const genericServices = [
        "General Inquiry / Customer Service",
        "Document Submission / Receiving",
        "Signing of Clearance",
        "Form / Document Application"
    ];

    async function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.supabaseReady) {
            try {
                return await window.supabaseReady;
            } catch (_) {
                return null;
            }
        }
        return null;
    }

    // Canonical Table Names
    const FEEDBACK_TABLE = 'feedbacks';
    const COMPLAIN_TABLE = 'complaints';
    const SETTINGS_TABLE = 'admin_settings';

    function isMissingTableError(error) {
        if (!error) return false;
        const msg = (error.message || '').toLowerCase();
        return error.code === '42P01' || msg.includes('relation') && msg.includes('does not exist');
    }

    function prepareFeedbackPayload(row) {
        if (!row || typeof row !== 'object') return row;
        const copy = { ...row };
        const ratings = { ...(copy.ratings || {}) };

        // Ensure non-schema root fields are preserved in ratings JSONB and removed from top-level object
        if (copy.client_name !== undefined) {
            if (ratings.client_name === undefined) ratings.client_name = copy.client_name;
            delete copy.client_name;
        }
        if (copy.client_email !== undefined) {
            if (ratings.client_email === undefined) ratings.client_email = copy.client_email;
            delete copy.client_email;
        }
        if (copy.date_visited !== undefined) {
            if (ratings.date_visited === undefined) ratings.date_visited = copy.date_visited;
            delete copy.date_visited;
        }
        if (copy.time_visited !== undefined) {
            if (ratings.time_visited === undefined) ratings.time_visited = copy.time_visited;
            delete copy.time_visited;
        }

        copy.ratings = ratings;
        return copy;
    }

    async function insertEvaluations(client, rows) {
        if (!client || !rows || rows.length === 0) return { data: [], error: null };
        const preparedRows = rows.map(r => prepareFeedbackPayload(r));
        let result = await client.from(FEEDBACK_TABLE).insert(preparedRows);

        if (result && result.error) {
            const errMsg = (result.error.message || '').toLowerCase();
            if (result.error.code === '42703' || errMsg.includes('column') || errMsg.includes('schema cache')) {
                console.warn('Database schema mismatch on feedback insert. Retrying with legacy fallback:', result.error.message);
                const colMatch = errMsg.match(/column\s+'?([a-zA-Z0-9_]+)'?/i) || errMsg.match(/'([a-zA-Z0-9_]+)'\s+column/i);
                const badCol = colMatch ? colMatch[1] : null;

                const fallbackRows = preparedRows.map(item => {
                    const copy = { ...item };
                    copy.ratings = { ...(item.ratings || {}) };
                    if (copy.served_by !== undefined) {
                        if (copy.ratings.served_by === undefined) copy.ratings.served_by = copy.served_by;
                        delete copy.served_by;
                    }
                    if (copy.region_of_residence !== undefined) {
                        if (copy.ratings.region_of_residence === undefined) copy.ratings.region_of_residence = copy.region_of_residence;
                        delete copy.region_of_residence;
                    }
                    if (badCol && copy[badCol] !== undefined) {
                        if (copy.ratings[badCol] === undefined) copy.ratings[badCol] = copy[badCol];
                        delete copy[badCol];
                    }
                    return copy;
                });
                result = await client.from(FEEDBACK_TABLE).insert(fallbackRows);
            }
        }
        return result;
    }

    async function selectEvaluations(client) {
        // Directly select from the feedbacks table
        return await client.from(FEEDBACK_TABLE).select('*').order('created_at', { ascending: false });
    }

    async function loadFormConfigFromDatabase() {
        try {
            const client = await getSupabaseClient();
            if (!client) return;

            const { data, error } = await client
                .from('admin_settings')
                .select('config')
                .eq('id', 'global_config')
                .maybeSingle();

            if (error) {
                console.warn('Failed to load admin settings from Supabase:', error);
                return;
            }

            if (data && data.config) {
                formConfig = normalizeFormConfig(data.config);
                localStorage.setItem('bisuFormConfig', JSON.stringify(formConfig));
            }
        } catch (err) {
            console.warn('Failed to load admin settings from Supabase (network/fetch error):', err);
        }
    }

    function updateServiceOptions(selectedOffice) {
        const serviceSelect = document.getElementById('service-availed-select');
        const customServiceContainer = document.getElementById('custom-service-container');
        const customInput = document.getElementById('service-availed-custom');
        if (!serviceSelect) return;

        const currentVal = serviceSelect.value;

        let services = [];
        if (selectedOffice && servicesByOffice[selectedOffice]) {
            services = servicesByOffice[selectedOffice];
        } else if (selectedOffice) {
            services = genericServices;
        }

        let selectLabel = "Select Service";
        if (translations[currentLang] && translations[currentLang]["t-sel-service"]) {
            selectLabel = translations[currentLang]["t-sel-service"];
        }
        let optionsHtml = `<option value="" selected id="t-sel-service">${selectLabel}</option>`;
        services.forEach(srv => {
            optionsHtml += `<option value="${srv}">${srv}</option>`;
        });
        optionsHtml += `<option value="Other">Other (Please specify...)</option>`;
        
        serviceSelect.innerHTML = optionsHtml;

        if (currentVal && Array.from(serviceSelect.options).some(opt => opt.value === currentVal)) {
            serviceSelect.value = currentVal;
        } else {
            serviceSelect.value = "";
        }

        if (serviceSelect.value === 'Other') {
            if (customServiceContainer) customServiceContainer.classList.remove('hidden');
            if (customInput) customInput.required = true;
        } else {
            if (customServiceContainer) customServiceContainer.classList.add('hidden');
            if (customInput) customInput.required = false;
        }
    }

    function renderDynamicFields() {
        const officeSelect = document.getElementById('office-visited');
        const reportCardSelect = document.getElementById('office-report-card-select');
        const compOfficeHeader = document.getElementById('comp-office-header');
        
        const populateSelect = (el) => {
            if(!el) return;
            const originalVal = el.value;
            let defaultText = 'Select Option';
            if (el.id === 'office-visited') defaultText = 'Select Office';
            else if (el.id === 'acc-office') defaultText = 'Select Target Office';
            else if (el.id === 'office-report-card-select') defaultText = 'Select Office for Card';
            else if (el.id === 'comp-office-header') defaultText = 'Select Office Concerned';
            
            el.innerHTML = `<option value="">${defaultText}</option>`;
            formConfig.offices.forEach(office => {
                el.innerHTML += `<option value="${office}">${office}</option>`;
            });
            el.value = originalVal;
        };

        populateSelect(officeSelect);
        populateSelect(reportCardSelect);
        populateSelect(accOfficeSelect);
        populateSelect(compOfficeHeader);

        if (officeSelect) {
            updateServiceOptions(officeSelect.value);
        }

        handleUrlQueryParameters();
        initCookieManager();
    }

    window.generateOfficeReportCard = function() {
        const officeSelect = document.getElementById('office-report-card-select');
        const office = officeSelect ? officeSelect.value : '';
        if(!office) {
            showToast("Please select an office first.", "error");
            return;
        }
        
        // Temporarily filter the dashboard view to ONLY see this office
        // Instead of complex refetching, we can use CSS to hide other rows
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const firstCell = row.querySelector('.col-office');
            if(firstCell) {
                const cellText = firstCell.textContent.trim();
                if(cellText !== office && cellText !== 'Overall Rating' && !cellText.includes('No data')) {
                    row.classList.add('hide-for-individual');
                } else {
                    row.classList.remove('hide-for-individual');
                }
            }
        });

        // Add a print rule to hide marked rows
        let style = document.getElementById('temp-print-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'temp-print-style';
            document.head.appendChild(style);
        }
        style.innerHTML = '@media print { .hide-for-individual { display: none !important; } }';

        window.printReportCard(office);
        
        // Cleanup after print
        const restoreRows = () => {
            rows.forEach(row => row.classList.remove('hide-for-individual'));
            if (style && style.parentNode) style.remove();
            window.removeEventListener('afterprint', restoreRows);
        };

        window.addEventListener('afterprint', restoreRows, { once: true });

        setTimeout(() => {
            rows.forEach(row => row.classList.remove('hide-for-individual'));
            if (style && style.parentNode) style.remove();
        }, 15000);
    };

    // === Initialization ===

    function updateDateTime() {
        const now = new Date();
        if (currentDatetimeEl) {
            currentDatetimeEl.textContent = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    function initDateTimeInputs() {
        const dateInput = document.getElementById('date-visited');
        const timeInput = document.getElementById('time-visited');

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${hh}:${min}`;

        if (dateInput) {
            if (!dateInput.value) dateInput.value = todayStr;
            dateInput.max = todayStr;
        }
        if (timeInput && !timeInput.value) {
            timeInput.value = currentTimeStr;
        }
        updateDayOfWeekBadge();
    }

    function updateDayOfWeekBadge() {
        const dateInput = document.getElementById('date-visited');
        const dayBadge = document.getElementById('day-of-week-badge');
        if (!dateInput || !dayBadge) return;

        const val = dateInput.value;
        if (!val) {
            dayBadge.textContent = 'Select Day';
            return;
        }

        const parts = val.split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (!isNaN(d.getTime())) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const compareD = new Date(d);
                compareD.setHours(0, 0, 0, 0);

                const diffDays = Math.round((today.getTime() - compareD.getTime()) / (1000 * 60 * 60 * 24));
                const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });

                if (diffDays === 0) {
                    dayBadge.textContent = `Today (${dayName})`;
                } else if (diffDays === 1) {
                    dayBadge.textContent = `Yesterday (${dayName})`;
                } else {
                    dayBadge.textContent = `${dayName} (${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
                }
                return;
            }
        }
        dayBadge.textContent = 'Selected Date';
    }

    initDateTimeInputs();

    let currentRatings = {};

    function renderLikertScales() {
        const container = document.getElementById('dimensions-container');
        container.innerHTML = '';

        let dims = formConfig.dimensions[currentLang] || formConfig.dimensions['en'];
        
        // Reset state tracker exactly to active dimensions
        currentRatings = {};
        dims.forEach(d => currentRatings[d.id] = null);

        dims.forEach(dim => {
            const dimDiv = document.createElement('div');
            dimDiv.id = `card-${dim.id}`;
            dimDiv.className = 'dimension-card py-2.5 px-3 sm:px-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-200 hover:shadow-xs flex-1 min-h-0 flex flex-col justify-center';
            
            let buttonsHtml = '';
            ratingValues.forEach(e => {
                const isNA = e.value === 0;
                buttonsHtml += `
                    <button type="button"
                        class="likert-btn relative flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 font-black shadow-2xs focus:outline-none w-full sm:w-[38px] sm:h-[38px] lg:w-[40px] lg:h-[40px] xl:w-[44px] xl:h-[44px] aspect-square max-w-[46px] mx-auto text-xs sm:text-sm lg:text-xs xl:text-sm ${isNA ? 'text-[10.5px] sm:text-xs font-black' : ''} ${e.colorClass} transition-all duration-150 transform cursor-pointer select-none"
                        data-dimension="${dim.id}" data-value="${e.value}" title="${e.label}" aria-label="${e.label}">
                        ${e.text || e.value}
                    </button>
                `;
            });

            dimDiv.innerHTML = `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                    <div class="flex items-start flex-1">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-slate-800 text-[13px] sm:text-[14.5px] lg:text-[14px] xl:text-[14.5px] flex items-center leading-tight">
                                ${dim.label} <span class="text-red-500 ml-1">*</span>
                            </h4>
                            <p class="text-[11px] sm:text-[12.5px] lg:text-[12px] xl:text-[12.5px] text-slate-500 font-medium leading-normal mt-0.5">${dim.desc}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-6 gap-1.5 sm:flex sm:items-center sm:gap-2 shrink-0 sm:self-center mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 w-full sm:w-auto">
                        ${buttonsHtml}
                    </div>
                </div>
            `;
            container.appendChild(dimDiv);
        });

        // Add event listeners to newly created buttons
        document.querySelectorAll('.likert-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const dim = this.getAttribute('data-dimension');
                const val = parseInt(this.getAttribute('data-value'));

                // Update State
                currentRatings[dim] = val;

                // Update UI visually with soft animation
                const parent = this.parentElement;
                parent.querySelectorAll('.likert-btn').forEach(b => {
                    b.classList.remove('selected', 'animate-select-pop');
                });
                this.classList.add('selected', 'animate-select-pop');

                // Soft highlight on card
                const card = document.getElementById(`card-${dim}`);
                if (card) card.classList.add('is-rated');

                checkFormCompletion();
            });
        });
        
        // Restore active selections visually if re-rendered
        for(let dim in currentRatings){
            if(currentRatings[dim] !== null){
                const btn = document.querySelector(`.likert-btn[data-dimension="${dim}"][data-value="${currentRatings[dim]}"]`);
                if(btn) btn.classList.add('selected');
                const card = document.getElementById(`card-${dim}`);
                if (card) card.classList.add('is-rated');
            }
        }
    }

    // === Submit Button Completion State ===
    // Button stays white until ALL required fields are filled, then turns blue.
    function checkFormCompletion() {
        const submitBtn = document.getElementById('submit-feedback-btn');
        if (!submitBtn) return;

        // 1. Required dropdowns/inputs
        const office = document.getElementById('office-visited')?.value;
        const clientType = document.getElementById('client-type')?.value;
        let serviceOk = false;
        const serviceSelect = document.getElementById('service-availed-select');
        if (serviceSelect) {
            if (serviceSelect.value === 'Other') {
                const custom = document.getElementById('service-availed-custom');
                serviceOk = !!(custom && custom.value.trim());
            } else {
                serviceOk = !!serviceSelect.value;
            }
        }

        // 2. Required CC radio groups (cc1, cc2, cc3)
        const cc1 = document.querySelector('input[name="cc1"]:checked');
        let ccOk = false;
        if (cc1 && cc1.value === '4') {
            ccOk = true;
        } else if (cc1) {
            const cc2 = document.querySelector('input[name="cc2"]:checked');
            const cc3 = document.querySelector('input[name="cc3"]:checked');
            ccOk = !!(cc2 && cc3);
        }

        // 3. All Likert ratings filled
        const activeDims = formConfig.dimensions[currentLang] || formConfig.dimensions['en'];
        const ratingsOk = activeDims.every(d => currentRatings[d.id] !== null && currentRatings[d.id] !== undefined);

        const complete = office && clientType && serviceOk && ccOk && ratingsOk;

        if (complete) {
            // Filled - solid blue
            submitBtn.classList.remove('bg-white', 'hover:bg-slate-50', 'text-bisu-blue', 'border-2', 'border-bisu-blue');
            submitBtn.classList.add('bg-bisu-blue', 'hover:bg-bisu-blue-dark', 'text-white');
        } else {
            // Incomplete - white outline
            submitBtn.classList.remove('bg-bisu-blue', 'hover:bg-bisu-blue-dark', 'text-white');
            submitBtn.classList.add('bg-white', 'hover:bg-slate-50', 'text-bisu-blue', 'border-2', 'border-bisu-blue');
        }
    }

    function updateCitizenCharterState() {
        const cc1Checked = document.querySelector('input[name="cc1"]:checked');
        const cc2Container = document.getElementById('cc2-container');
        const cc3Container = document.getElementById('cc3-container');
        const cc2Radios = document.querySelectorAll('input[name="cc2"]');
        const cc3Radios = document.querySelectorAll('input[name="cc3"]');

        if (cc1Checked && cc1Checked.value === '4') {
            // Option 4: "I do not know what a CC is and I did not see one in this office."
            // Grey out CC2 & CC3 and make them not clickable
            if (cc2Container) {
                cc2Container.classList.add('opacity-35', 'pointer-events-none', 'select-none', 'filter', 'grayscale-[60%]', 'cursor-not-allowed');
                cc2Container.setAttribute('aria-disabled', 'true');
            }
            if (cc3Container) {
                cc3Container.classList.add('opacity-35', 'pointer-events-none', 'select-none', 'filter', 'grayscale-[60%]', 'cursor-not-allowed');
                cc3Container.setAttribute('aria-disabled', 'true');
            }

            // Auto-check N/A for CC2 (value 5) and CC3 (value 4)
            const cc2NA = document.querySelector('input[name="cc2"][value="5"]');
            const cc3NA = document.querySelector('input[name="cc3"][value="4"]');
            if (cc2NA) cc2NA.checked = true;
            if (cc3NA) cc3NA.checked = true;

            // Disable radio inputs
            cc2Radios.forEach(r => r.disabled = true);
            cc3Radios.forEach(r => r.disabled = true);
        } else {
            // Option 1, 2, 3 or none: restore normal interactive state
            if (cc2Container) {
                cc2Container.classList.remove('opacity-35', 'pointer-events-none', 'select-none', 'filter', 'grayscale-[60%]', 'cursor-not-allowed');
                cc2Container.removeAttribute('aria-disabled');
            }
            if (cc3Container) {
                cc3Container.classList.remove('opacity-35', 'pointer-events-none', 'select-none', 'filter', 'grayscale-[60%]', 'cursor-not-allowed');
                cc3Container.removeAttribute('aria-disabled');
            }

            cc2Radios.forEach(r => r.disabled = false);
            cc3Radios.forEach(r => r.disabled = false);

            if (cc1Checked && (cc1Checked.value === '1' || cc1Checked.value === '2' || cc1Checked.value === '3')) {
                // If N/A was previously auto-selected when 4 was picked, uncheck it so user can choose actively
                const cc2NA = document.querySelector('input[name="cc2"][value="5"]');
                const cc3NA = document.querySelector('input[name="cc3"][value="4"]');
                if (cc2NA && cc2NA.checked) cc2NA.checked = false;
                if (cc3NA && cc3NA.checked) cc3NA.checked = false;
            }
        }
        checkFormCompletion();
    }

    async function initializeFormConfig() {
        await loadFormConfigFromDatabase();
        renderDynamicFields();
        renderLikertScales();
        loadSavedQrsFromDatabase();
    }

    initializeFormConfig();

    function applyTranslations(lang) {
        currentLang = lang;
        const dict = translations[lang];
        for (let key in dict) {
            const el = document.getElementById(key);
            if (el) el.innerHTML = dict[key];
        }
        renderLikertScales();

        const officeSelect = document.getElementById('office-visited');
        if (officeSelect) {
            updateServiceOptions(officeSelect.value);
        }
    }

    const langSelector = document.getElementById('language-selector');
    const langSelectorMobile = document.getElementById('language-selector-mobile');
    
    if(langSelector) {
        langSelector.addEventListener('change', (e) => {
            applyTranslations(e.target.value);
            if(langSelectorMobile) langSelectorMobile.value = e.target.value;
        });
    }
    if(langSelectorMobile) {
        langSelectorMobile.addEventListener('change', (e) => {
            applyTranslations(e.target.value);
            if(langSelector) langSelector.value = e.target.value;
        });
    }

    // === Event Listeners ===

    const officeSelect = document.getElementById('office-visited');
    if (officeSelect) {
        officeSelect.addEventListener('change', (e) => {
            updateServiceOptions(e.target.value);
        });
    }

    const serviceSelect = document.getElementById('service-availed-select');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', (e) => {
            const customServiceContainer = document.getElementById('custom-service-container');
            const customInput = document.getElementById('service-availed-custom');
            if (e.target.value === 'Other') {
                if (customServiceContainer) customServiceContainer.classList.remove('hidden');
                if (customInput) {
                    customInput.required = true;
                    setTimeout(() => customInput.focus(), 100);
                }
            } else {
                if (customServiceContainer) customServiceContainer.classList.add('hidden');
                if (customInput) customInput.required = false;
            }
        });
    }

    consentCheckbox.addEventListener('change', (e) => {
        acceptConsentBtn.disabled = !e.target.checked;
    });

    // Date and Time picker interactions for feedback form
    const dateVisitedEl = document.getElementById('date-visited');
    const timeVisitedEl = document.getElementById('time-visited');
    const btnSetNow = document.getElementById('btn-set-now');
    const btnPresetAm = document.getElementById('btn-preset-am');
    const btnPresetPm = document.getElementById('btn-preset-pm');

    if (dateVisitedEl) {
        dateVisitedEl.addEventListener('change', updateDayOfWeekBadge);
        dateVisitedEl.addEventListener('input', updateDayOfWeekBadge);
    }

    if (btnSetNow) {
        btnSetNow.addEventListener('click', () => {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            if (dateVisitedEl) dateVisitedEl.value = `${yyyy}-${mm}-${dd}`;
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            if (timeVisitedEl) timeVisitedEl.value = `${hh}:${min}`;
            updateDayOfWeekBadge();
            showToast('Date & time set to current time.', 'info');
        });
    }

    if (btnPresetAm) {
        btnPresetAm.addEventListener('click', () => {
            if (timeVisitedEl) timeVisitedEl.value = '09:00';
            showToast('Time set to 9:00 AM', 'info');
        });
    }

    if (btnPresetPm) {
        btnPresetPm.addEventListener('click', () => {
            if (timeVisitedEl) timeVisitedEl.value = '14:00';
            showToast('Time set to 2:00 PM', 'info');
        });
    }

    acceptConsentBtn.addEventListener('click', () => {
        privacyModal.classList.add('opacity-0');
        setTimeout(() => {
            privacyModal.style.display = 'none';
            viewFeedback.classList.remove('section-hidden');
        }, 300);
    });

    function switchToComplaintView(prefilledOffice = '', updateRoute = true) {
        const viewFeedback = document.getElementById('view-feedback');
        const viewComplaint = document.getElementById('view-complaint');
        const compOfficeHeader = document.getElementById('comp-office-header');
        const compPlace = document.getElementById('comp-place');
        const compPerson = document.getElementById('comp-person-complained-of');
        const compDateSigned = document.getElementById('comp-date-signed-display');
        const qrIndicator = document.getElementById('complaint-qr-indicator');
        const qrOfficeName = document.getElementById('complaint-qr-office-name');

        if (viewFeedback) viewFeedback.classList.add('section-hidden');
        if (viewComplaint) viewComplaint.classList.remove('section-hidden');
        window.scrollTo(0, 0);

        // Pre-fill office if available
        const selectedOffice = prefilledOffice || document.getElementById('office-visited')?.value || '';
        if (selectedOffice && compOfficeHeader) {
            let matchOpt = Array.from(compOfficeHeader.options).find(opt => opt.value.toLowerCase() === selectedOffice.toLowerCase());
            if (matchOpt) {
                compOfficeHeader.value = matchOpt.value;
            } else if (selectedOffice) {
                const opt = document.createElement('option');
                opt.value = selectedOffice;
                opt.textContent = selectedOffice;
                compOfficeHeader.appendChild(opt);
                compOfficeHeader.value = selectedOffice;
            }
        }

        if (selectedOffice) {
            if (compPlace && !compPlace.value) compPlace.value = selectedOffice;
            if (compPerson && !compPerson.value) compPerson.placeholder = `Name of staff / personnel in ${selectedOffice} (or Office/Unit if unknown)`;
            if (qrIndicator && qrOfficeName) {
                qrOfficeName.textContent = `Office: ${selectedOffice}`;
                qrIndicator.classList.remove('hidden');
            }
        }

        // Set date signed display
        if (compDateSigned) {
            const today = new Date();
            compDateSigned.textContent = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        }

        if (updateRoute && typeof syncUrlRoute === 'function') {
            syncUrlRoute('complaint', { office: selectedOffice });
        }
    }

    if (toggleComplaintBtn) {
        toggleComplaintBtn.addEventListener('click', () => {
            const currentOffice = document.getElementById('office-visited')?.value;
            switchToComplaintView(currentOffice, true);
        });
    }

    const qrBannerFileComplaintBtn = document.getElementById('qr-banner-file-complaint-btn');
    if (qrBannerFileComplaintBtn) {
        qrBannerFileComplaintBtn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const officeParam = urlParams.get('office');
            switchToComplaintView(officeParam, true);
        });
    }

    if (backToFeedbackBtn) {
        backToFeedbackBtn.addEventListener('click', () => {
            showDefaultView(true);
            window.scrollTo(0,0);
        });
    }

    if (clearComplaintBtn) {
        clearComplaintBtn.addEventListener('click', () => {
            if (complaintForm) complaintForm.reset();
            const compAttachmentFilename = document.getElementById('comp-attachment-filename');
            if (compAttachmentFilename) compAttachmentFilename.textContent = 'No file selected';
            compAttachmentData = null;
        });
    }

    let compAttachmentData = null;
    const compAttachmentInput = document.getElementById('comp-attachment-input');
    if (compAttachmentInput) {
        compAttachmentInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const compAttachmentFilename = document.getElementById('comp-attachment-filename');
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('File size must be under 5MB.', 'warning');
                    compAttachmentInput.value = '';
                    if (compAttachmentFilename) compAttachmentFilename.textContent = 'No file selected';
                    compAttachmentData = null;
                    return;
                }
                if (compAttachmentFilename) compAttachmentFilename.textContent = file.name;
                const reader = new FileReader();
                reader.onloadend = () => {
                    compAttachmentData = {
                        name: file.name,
                        type: file.type,
                        data: reader.result
                    };
                };
                reader.readAsDataURL(file);
            } else {
                if (compAttachmentFilename) compAttachmentFilename.textContent = 'No file selected';
                compAttachmentData = null;
            }
        });
    }

    function updateDashboardRoleUI() {
        const isOffice = currentUserRole === 'office' && !!currentOfficeScope;
        
        // Sidebar elements
        const sidebarTitle = document.getElementById('admin-sidebar-title');
        const sidebarOfficeBadge = document.getElementById('sidebar-office-badge');
        const sidebarOfficeName = document.getElementById('sidebar-office-name');
        const sidebarQrLabel = document.getElementById('sidebar-qr-label');
        const sidebarPrintLabel = document.getElementById('sidebar-print-label');
        const sidebarLogoutLabel = document.getElementById('sidebar-logout-label');
        const adminOnlyFeatures = document.querySelectorAll('.admin-only-feature');
        
        // Main Dashboard header elements
        const mainTitle = document.getElementById('admin-main-title');
        const mainSubtitle = document.getElementById('admin-main-subtitle');
        const officeScopeBadge = document.getElementById('admin-office-scope-badge');
        const officeScopeText = document.getElementById('admin-office-scope-text');
        
        // Print header element
        const printOfficeConcerned = document.getElementById('print-office-concerned');
        
        // MRC Select
        const reportCardSelect = document.getElementById('office-report-card-select');

        if (isOffice) {
            if (sidebarTitle) sidebarTitle.textContent = 'Office Portal';
            if (sidebarOfficeBadge) {
                sidebarOfficeBadge.classList.remove('hidden');
                sidebarOfficeBadge.classList.add('flex');
            }
            if (sidebarOfficeName) sidebarOfficeName.textContent = currentOfficeScope;
            if (sidebarQrLabel) sidebarQrLabel.textContent = 'Office QR Code';
            if (sidebarPrintLabel) sidebarPrintLabel.textContent = 'Print Office Dashboard';
            if (sidebarLogoutLabel) sidebarLogoutLabel.textContent = 'Exit Office Portal';
            
            // Hide admin only management and maintenance features
            adminOnlyFeatures.forEach(el => el.classList.add('hidden'));
            
            // Main Header
            if (mainTitle) mainTitle.textContent = `${currentOfficeScope} Analytics`;
            if (officeScopeBadge) {
                officeScopeBadge.classList.remove('hidden');
                officeScopeBadge.classList.add('inline-flex');
            }
            if (officeScopeText) officeScopeText.textContent = currentOfficeScope;
            if (mainSubtitle) {
                mainSubtitle.innerHTML = `Real-time customer satisfaction metrics and performance logs for <strong>${escapeHtml(currentOfficeScope)}</strong>.`;
            }
            
            if (printOfficeConcerned) {
                printOfficeConcerned.textContent = currentOfficeScope;
            }

            // Set and lock the MRC select
            if (reportCardSelect) {
                reportCardSelect.value = currentOfficeScope;
            }
        } else {
            if (sidebarTitle) sidebarTitle.textContent = 'Admin Console';
            if (sidebarOfficeBadge) {
                sidebarOfficeBadge.classList.add('hidden');
                sidebarOfficeBadge.classList.remove('flex');
            }
            if (sidebarQrLabel) sidebarQrLabel.textContent = 'QR Code Generator';
            if (sidebarPrintLabel) sidebarPrintLabel.textContent = 'Print Full Dashboard';
            if (sidebarLogoutLabel) sidebarLogoutLabel.textContent = 'Close Admin Session';
            
            // Show admin features
            adminOnlyFeatures.forEach(el => el.classList.remove('hidden'));
            
            // Main Header
            if (mainTitle) mainTitle.textContent = 'Customer Satisfaction Analytics';
            if (officeScopeBadge) {
                officeScopeBadge.classList.add('hidden');
                officeScopeBadge.classList.remove('inline-flex');
            }
            if (mainSubtitle) {
                mainSubtitle.innerHTML = 'Real-time customer satisfaction metrics and service performance logs. <span id="db-connection-detail" class="text-slate-400"></span>';
            }
            
            if (printOfficeConcerned) {
                printOfficeConcerned.textContent = 'All Campus Offices';
            }
        }
    }

    function openAdminView(updateRoute = true) {
        viewFeedback.classList.add('section-hidden');
        viewComplaint.classList.add('section-hidden');
        privacyModal.classList.add('hidden');
        privacyModal.classList.remove('flex');
        privacyModal.style.display = 'none';
        viewAdmin.classList.remove('section-hidden');
        document.body.classList.add('admin-layout');

        // Hide admin login/lock buttons
        if (adminLoginBtn) adminLoginBtn.classList.add('hidden');
        if (adminLoginBtnMobile) adminLoginBtnMobile.classList.add('hidden');
        
        // Auto-collapse mobile sidebar navigation on view enter
        const sidebarContent = document.getElementById('sidebar-content');
        const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
        if (sidebarContent && window.innerWidth < 1280) {
            sidebarContent.classList.add('hidden');
            sidebarContent.classList.remove('flex');
            if (sidebarToggleIcon) {
                sidebarToggleIcon.classList.add('fa-bars');
                sidebarToggleIcon.classList.remove('fa-xmark');
            }
        }

        updateDashboardRoleUI();

        const dashScroll = document.getElementById('admin-dashboard-scroll');
        if (dashScroll) dashScroll.scrollTop = 0;

        if (updateRoute && typeof syncUrlRoute === 'function') {
            syncUrlRoute('admin');
        }
    }

    function closeAdminView(updateRoute = true) {
        showDefaultView(false);
        document.body.classList.remove('admin-layout');

        // Show admin login/lock buttons
        if (adminLoginBtn) adminLoginBtn.classList.remove('hidden');
        if (adminLoginBtnMobile) adminLoginBtnMobile.classList.remove('hidden');

        currentUserRole = 'super_admin';
        currentOfficeScope = null;
        updateDashboardRoleUI();

        if (updateRoute && typeof syncUrlRoute === 'function') {
            syncUrlRoute('feedback');
        }
    }

    async function isCurrentUserAdmin(client) {
        if (localStorage.getItem('isLocalAdmin') === 'true') {
            currentUserRole = 'super_admin';
            currentOfficeScope = null;
            sessionStorage.setItem('currentUserRole', 'super_admin');
            sessionStorage.removeItem('currentOfficeAccount');
            return true;
        }
        if (localStorage.getItem('isLocalOfficeUser') === 'true') {
            currentUserRole = 'office';
            currentOfficeScope = localStorage.getItem('localOfficeName') || sessionStorage.getItem('currentOfficeAccount');
            sessionStorage.setItem('currentUserRole', 'office');
            if (currentOfficeScope) {
                sessionStorage.setItem('currentOfficeAccount', currentOfficeScope);
            }
            return true;
        }
        try {
            const { data: authData, error: authError } = await client.auth.getUser();
            if (authError || !authData?.user) return false;

            // 1. Check admin_users table
            const { data: adminData, error: adminError } = await client
                .from('admin_users')
                .select('user_id')
                .eq('user_id', authData.user.id)
                .maybeSingle();

            if (adminData) {
                currentUserRole = 'super_admin';
                currentOfficeScope = null;
                sessionStorage.setItem('currentUserRole', 'super_admin');
                sessionStorage.removeItem('currentOfficeAccount');
                return true;
            }

            // 2. Check office_accounts table
            if (authData.user.email) {
                const { data: officeData } = await client
                    .from('office_accounts')
                    .select('id, office_name, email')
                    .eq('email', authData.user.email)
                    .maybeSingle();
                if (officeData) {
                    currentUserRole = 'office';
                    currentOfficeScope = officeData.office_name;
                    sessionStorage.setItem('currentUserRole', 'office');
                    sessionStorage.setItem('currentOfficeAccount', officeData.office_name);
                    return true;
                }

                // 2b. Check admin_settings (id = 'office_accounts')
                try {
                    const { data: sData } = await client
                        .from('admin_settings')
                        .select('config')
                        .eq('id', 'office_accounts')
                        .maybeSingle();
                    if (sData && Array.isArray(sData.config)) {
                        const matched = sData.config.find(a => a.email && a.email.toLowerCase() === authData.user.email.toLowerCase());
                        if (matched) {
                            currentUserRole = 'office';
                            currentOfficeScope = matched.office_name;
                            sessionStorage.setItem('currentUserRole', 'office');
                            sessionStorage.setItem('currentOfficeAccount', matched.office_name);
                            return true;
                        }
                    }
                } catch (e) {
                    console.warn('admin_settings office verification notice:', e);
                }
            }

            // 3. Check local office accounts if any
            if (typeof getLocalOfficeAccounts === 'function' && authData.user.email) {
                const localAccounts = getLocalOfficeAccounts();
                const matched = localAccounts.find(acc => acc.email && acc.email.toLowerCase() === authData.user.email.toLowerCase());
                if (matched) {
                    currentUserRole = 'office';
                    currentOfficeScope = matched.office_name;
                    sessionStorage.setItem('currentUserRole', 'office');
                    sessionStorage.setItem('currentOfficeAccount', matched.office_name);
                    return true;
                }
            }

            if (adminError) {
                console.warn('Admin verification notice:', adminError.message);
            }

            return false;
        } catch (err) {
            console.warn('Network or session error during admin check:', err);
            return false;
        }
    }

    function openAdminLoginModal() {
        adminLoginModal.classList.remove('hidden');
        adminLoginModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        setTimeout(() => loginEmailInput.focus(), 100);
    }

    adminLoginBtn.addEventListener('click', openAdminLoginModal);

    // Mobile admin login button
    if(adminLoginBtnMobile) {
        adminLoginBtnMobile.addEventListener('click', openAdminLoginModal);
    }

    closeLoginBtn.addEventListener('click', () => {
        adminLoginModal.classList.add('hidden');
        adminLoginModal.classList.remove('flex');
        document.body.style.overflow = '';
        adminLoginForm.reset();
    });

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;

        submitLoginBtn.disabled = true;
        submitLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Logging in...';

        // 1. Super Admin Local Fallback
        if (email === 'admin@bisu.edu.ph' && password === 'bisuadmin') {
            localStorage.setItem('isLocalAdmin', 'true');
            localStorage.removeItem('isLocalOfficeUser');
            localStorage.removeItem('localOfficeName');
            currentUserRole = 'super_admin';
            currentOfficeScope = null;
            sessionStorage.setItem('currentUserRole', 'super_admin');
            sessionStorage.removeItem('currentOfficeAccount');

            showToast('Local admin mode. For live database data, sign in with a Supabase Auth admin account.', 'warning');
            adminLoginModal.classList.add('hidden');
            adminLoginModal.classList.remove('flex');
            document.body.style.overflow = '';
            adminLoginForm.reset();
            openAdminView();
            fetchAdminData();
            submitLoginBtn.disabled = false;
            submitLoginBtn.innerHTML = 'Login to Dashboard';
            return;
        }

        // 2. Check if this email matches any known office account (either local or database)
        let localAccounts = [];
        if (typeof getLocalOfficeAccounts === 'function') {
            localAccounts = getLocalOfficeAccounts();
        }
        const matchedLocalOffice = localAccounts.find(acc => acc.email && acc.email.toLowerCase() === email.toLowerCase());

        const client = await getSupabaseClient();

        // If Supabase client is available, try signing in with Supabase Auth
        if (client) {
            try {
                localStorage.removeItem('isLocalAdmin');
                localStorage.removeItem('isLocalOfficeUser');
                localStorage.removeItem('localOfficeName');

                const { data: authResult, error: signInError } = await client.auth.signInWithPassword({
                    email,
                    password
                });

                if (!signInError && authResult?.user) {
                    const adminAllowed = await isCurrentUserAdmin(client);
                    if (adminAllowed) {
                        adminLoginModal.classList.add('hidden');
                        adminLoginModal.classList.remove('flex');
                        document.body.style.overflow = '';
                        adminLoginForm.reset();
                        
                        if (currentUserRole === 'office' && currentOfficeScope) {
                            showToast(`Connected to ${currentOfficeScope} Office Portal.`, 'success');
                        } else {
                            showToast('Connected to database as Administrator.', 'success');
                        }
                        openAdminView();
                        fetchAdminData();
                        submitLoginBtn.disabled = false;
                        submitLoginBtn.innerHTML = 'Login to Dashboard';
                        return;
                    }
                }
            } catch (err) {
                console.warn('Supabase Auth attempt notice:', err);
            }
        }

        // 3. Check direct database office_accounts table, admin_settings, or local storage accounts
        let matchedOffice = matchedLocalOffice;
        if (client) {
            try {
                const { data: officeRows } = await client.from('office_accounts')
                    .select('office_name, email, password')
                    .eq('email', email)
                    .maybeSingle();
                if (officeRows) {
                    if (!officeRows.password || officeRows.password === password) {
                        matchedOffice = officeRows;
                    }
                }
            } catch (e) {
                console.warn('Direct office_accounts check:', e);
            }

            if (!matchedOffice) {
                try {
                    const { data: sData } = await client
                        .from('admin_settings')
                        .select('config')
                        .eq('id', 'office_accounts')
                        .maybeSingle();
                    if (sData && Array.isArray(sData.config)) {
                        const found = sData.config.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
                        if (found) {
                            if (!found.password || found.password === password) {
                                matchedOffice = found;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Direct admin_settings office check:', e);
                }
            }
        }

        if (matchedOffice) {
            localStorage.removeItem('isLocalAdmin');
            localStorage.setItem('isLocalOfficeUser', 'true');
            localStorage.setItem('localOfficeName', matchedOffice.office_name);
            currentUserRole = 'office';
            currentOfficeScope = matchedOffice.office_name;
            sessionStorage.setItem('currentUserRole', 'office');
            sessionStorage.setItem('currentOfficeAccount', matchedOffice.office_name);

            adminLoginModal.classList.add('hidden');
            adminLoginModal.classList.remove('flex');
            document.body.style.overflow = '';
            adminLoginForm.reset();
            showToast(`Welcome to ${matchedOffice.office_name} Office Portal!`, 'success');
            openAdminView();
            fetchAdminData();
            submitLoginBtn.disabled = false;
            submitLoginBtn.innerHTML = 'Login to Dashboard';
            return;
        }

        showToast('Login failed: Invalid credentials or account is not registered as an administrator or office account.', 'error');
        submitLoginBtn.disabled = false;
        submitLoginBtn.innerHTML = 'Login to Dashboard';
    });

    if (logoutAdminBtn) {
        logoutAdminBtn.addEventListener('click', async () => {
            localStorage.removeItem('isLocalAdmin');
            localStorage.removeItem('isLocalOfficeUser');
            localStorage.removeItem('localOfficeName');
            sessionStorage.removeItem('currentOfficeAccount');
            sessionStorage.removeItem('currentUserRole');
            currentUserRole = 'super_admin';
            currentOfficeScope = null;
            const client = await getSupabaseClient();
            if (client) {
                try {
                    await client.auth.signOut();
                } catch (e) {
                    console.warn('Signout issue:', e);
                }
            }
            closeAdminView();
        });
    }

    // --- Complaints Modal Logic ---
    const adminComplaintsModal = document.getElementById('admin-complaints-modal');
    const closeComplaintsBtn = document.getElementById('close-complaints-btn');
    const viewComplaintsBtn = document.getElementById('view-complaints-btn');
    const complaintSearchInput = document.getElementById('complaints-search-input');
    const printComplaintsSummaryBtn = document.getElementById('print-complaints-summary-btn');
    
    if (viewComplaintsBtn && adminComplaintsModal) {
        viewComplaintsBtn.addEventListener('click', () => {
            adminComplaintsModal.classList.remove('hidden');
            adminComplaintsModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
            if (complaintSearchInput) complaintSearchInput.value = '';
            renderComplaintsModalList(null, true);
        });
    }

    if (closeComplaintsBtn && adminComplaintsModal) {
        closeComplaintsBtn.addEventListener('click', () => {
            adminComplaintsModal.classList.add('hidden');
            adminComplaintsModal.classList.remove('flex');
            document.body.style.overflow = '';
        });
    }

    let complaintSearchTimeout = null;
    if (complaintSearchInput) {
        complaintSearchInput.addEventListener('input', () => {
            if (complaintSearchTimeout) clearTimeout(complaintSearchTimeout);
            complaintSearchTimeout = setTimeout(() => {
                renderComplaintsModalList(null, true);
            }, 100);
        });
    }

    if (printComplaintsSummaryBtn) {
        printComplaintsSummaryBtn.addEventListener('click', () => {
            const list = currentModalComplaintsData || [];
            if (list.length === 0) {
                showToast('No complaints available to print.', 'info');
                return;
            }
            let rowsHtml = '';
            list.forEach((c, idx) => {
                const isAnon = !c.name || c.name.trim().toLowerCase() === 'anonymous' || c.name.trim() === '';
                rowsHtml += `
                    <div style="margin-bottom: 25px; padding: 20px; border: 1px solid #cbd5e1; border-radius: 10px; background-color: #fff; page-break-inside: avoid;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px;">
                            <strong style="font-size: 15px; color: #0f172a;">#${idx + 1} - ${isAnon ? 'Anonymous Complainant' : escapeHtml(c.name)}</strong>
                            <span style="font-size: 12px; color: #64748b;">Filed: ${new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 12px; background: #f8fafc; padding: 12px; border-radius: 6px;">
                            <div><strong>Contact Details:</strong> ${escapeHtml(c.contact_details || 'Not provided')}</div>
                            <div><strong>Incident Date:</strong> ${escapeHtml(c.date_of_incident || 'N/A')}</div>
                            <div><strong>Incident Place:</strong> ${escapeHtml(c.place_of_incident || 'N/A')}</div>
                            <div><strong>Subject / Act Complained Of:</strong> <span style="color: #dc2626; font-weight: bold;">${escapeHtml(c.details_of_complaint || 'N/A')}</span></div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="font-size: 11px; color: #475569; text-transform: uppercase;">Detailed Narrative Report:</strong>
                            <p style="margin: 4px 0 0 0; font-size: 13px; padding: 12px; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-wrap;">${escapeHtml(c.narrative_report || 'None')}</p>
                        </div>
                        <div>
                            <strong style="font-size: 11px; color: #991b1b; text-transform: uppercase;">Expected Resolution / Desired Outcome:</strong>
                            <p style="margin: 4px 0 0 0; font-size: 13px; padding: 12px; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; white-space: pre-wrap; color: #881337;">${escapeHtml(c.desired_outcome || 'None')}</p>
                        </div>
                    </div>
                `;
            });

            const fullHtml = `
                <html><head><title>Filed Complaints Directory - BISU Calape</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5;">
                    <div style="text-align: center; border-bottom: 2px solid #E84A1C; padding-bottom: 20px; margin-bottom: 30px;">
                        <h2 style="color: #E84A1C; margin: 0; font-size: 22px;">Bohol Island State University - Calape</h2>
                        <h3 style="color: #64748b; margin: 5px 0 0 0; font-size: 15px;">Summary Directory of Filed Complaints (${list.length} Total Records)</h3>
                    </div>
                    ${rowsHtml}
                    <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        Generated via BISU Administrative Feedback System on ${new Date().toLocaleString()}
                    </div>
                </body></html>
            `;

            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(fullHtml);
                printWin.document.close();
                printWin.focus();
                setTimeout(() => { printWin.print(); printWin.close(); }, 300);
            }
        });
    }

    // --- Accounts Management Logic ---

    function getLocalOfficeAccounts() {
        try {
            const raw = localStorage.getItem('bisu_office_accounts');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveLocalOfficeAccounts(list) {
        try {
            localStorage.setItem('bisu_office_accounts', JSON.stringify(list));
        } catch (e) {
            console.warn('Failed to cache office accounts:', e);
        }
    }

    async function fetchOfficeAccounts() {
        if (!accountsTableBody) return;
        accountsTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400 italic"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading accounts from database...</td></tr>`;

        let accounts = [];

        try {
            const client = await getSupabaseClient();
            if (client) {
                // 1. Try querying dedicated office_accounts table
                try {
                    const { data, error } = await client.from('office_accounts').select('*').order('office_name', { ascending: true });
                    if (!error && data && data.length > 0) {
                        accounts = data;
                    } else if (error) {
                        console.warn('Supabase office_accounts fetch notice:', error.message);
                    }
                } catch (e) {
                    console.warn('office_accounts table query error:', e);
                }

                // 2. Query fallback from admin_settings table (id = 'office_accounts')
                try {
                    const { data: sData } = await client
                        .from('admin_settings')
                        .select('config')
                        .eq('id', 'office_accounts')
                        .maybeSingle();
                    if (sData && Array.isArray(sData.config) && sData.config.length > 0) {
                        const existingEmails = new Set(accounts.map(a => (a.email || '').toLowerCase()));
                        sData.config.forEach(item => {
                            if (item.email && !existingEmails.has(item.email.toLowerCase())) {
                                accounts.push(item);
                                existingEmails.add(item.email.toLowerCase());
                            }
                        });
                    }
                } catch (e) {
                    console.warn('admin_settings office_accounts query error:', e);
                }
            }
        } catch (e) {
            console.warn('fetchOfficeAccounts database query error:', e);
        }

        if (accounts.length === 0) {
            accounts = getLocalOfficeAccounts();
        } else {
            saveLocalOfficeAccounts(accounts);
        }

        accountsTableBody.innerHTML = '';
        if (!accounts || accounts.length === 0) {
            accountsTableBody.innerHTML = `<tr><td colspan="3" class="px-4 py-8 text-center text-slate-400 italic">No office accounts registered.</td></tr>`;
            return;
        }

        accounts.forEach((acc, idx) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-slate-100 last:border-0 hover:bg-slate-50 transition';
            const accId = acc.id || `local_${idx}`;
            tr.innerHTML = `
                <td class="px-4 py-3 font-semibold text-bisu-blue">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-building-user text-xs text-blue-600"></i>
                        <span>${escapeHtml(acc.office_name || 'Assigned Office')}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-slate-700">
                    <div class="flex items-center gap-1.5 font-mono text-xs">
                        <i class="fa-solid fa-envelope text-slate-400 text-[11px]"></i>
                        <span>${escapeHtml(acc.email)}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-right">
                    <button onclick="deleteOfficeAccount('${accId}', '${escapeHtml(acc.email)}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ml-auto">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                        <span>Delete</span>
                    </button>
                </td>
            `;
            accountsTableBody.appendChild(tr);
        });
    }

    if(manageAccountsBtn) {
        manageAccountsBtn.addEventListener('click', () => {
            manageAccountsModal.classList.remove('hidden');
            manageAccountsModal.classList.add('flex');
            document.body.style.overflow = 'hidden';

            if (accOfficeSelect && formConfig && formConfig.offices) {
                const currentVal = accOfficeSelect.value;
                accOfficeSelect.innerHTML = '<option value="">Select Target Office</option>';
                formConfig.offices.forEach(office => {
                    accOfficeSelect.innerHTML += `<option value="${escapeHtml(office)}">${escapeHtml(office)}</option>`;
                });
                accOfficeSelect.value = currentVal;
            }

            fetchOfficeAccounts();
        });
    }

    if(closeAccountsBtn) {
        closeAccountsBtn.addEventListener('click', () => {
            manageAccountsModal.classList.add('hidden');
            manageAccountsModal.classList.remove('flex');
            document.body.style.overflow = '';
            if(officeAccountForm) officeAccountForm.reset();
        });
    }

    if(manageAccountsModal) {
        manageAccountsModal.addEventListener('click', (e) => {
            if (e.target === manageAccountsModal && closeAccountsBtn) {
                closeAccountsBtn.click();
            }
        });
    }

    if(officeAccountForm) {
        officeAccountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const office = accOfficeSelect.value;
            const email = accEmailInput.value.trim().toLowerCase();
            const password = accPasswordInput.value;

            if (!email || !office) {
                showToast('Please specify a target office and email address.', 'warning');
                return;
            }

            if (!password || password.length < 6) {
                showToast('Password must be at least 6 characters.', 'warning');
                return;
            }

            submitAccBtn.disabled = true;
            submitAccBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving to Database...';

            let savedToSupabase = false;
            let client = null;
            try {
                client = await getSupabaseClient();
            } catch (ce) {
                console.warn('Supabase client error:', ce);
            }

            if (client) {
                // 1. Try registering user in Supabase Auth
                try {
                    const { error: signUpError } = await client.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                office_name: office,
                                role: 'office'
                            }
                        }
                    });
                    if (signUpError) {
                        if (signUpError.message.toLowerCase().includes("already registered")) {
                            const { error: rpcError } = await client.rpc('admin_change_user_password', { target_email: email, new_password: password });
                            if (rpcError) {
                                console.warn('RPC password update issue:', rpcError.message);
                            }
                        } else {
                            console.warn("Auth SignUp Note:", signUpError.message);
                        }
                    }
                } catch (ae) {
                    console.warn('Auth attempt error:', ae);
                }

                // 2. Save directly to public.office_accounts table
                try {
                    const { data: existing } = await client.from('office_accounts').select('id').eq('email', email).maybeSingle();
                    if (existing) {
                        const { error: updateErr } = await client.from('office_accounts').update({
                            office_name: office,
                            password: password,
                            updated_at: new Date().toISOString()
                        }).eq('id', existing.id);
                        if (!updateErr) savedToSupabase = true;
                        else {
                            const { error: retryErr } = await client.from('office_accounts').update({
                                office_name: office
                            }).eq('id', existing.id);
                            if (!retryErr) savedToSupabase = true;
                        }
                    } else {
                        const { error: insertErr } = await client.from('office_accounts').insert([{
                            email,
                            office_name: office,
                            password: password,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }]);
                        if (!insertErr) savedToSupabase = true;
                        else {
                            const { error: retryInsertErr } = await client.from('office_accounts').insert([{
                                email,
                                office_name: office
                            }]);
                            if (!retryInsertErr) savedToSupabase = true;
                        }
                    }
                } catch (dbErr) {
                    console.warn('Database write to office_accounts table issue:', dbErr);
                }

                // 3. Save to admin_settings table (id = 'office_accounts') for resilient fallback
                try {
                    let settingsList = [];
                    const { data: sData } = await client
                        .from('admin_settings')
                        .select('config')
                        .eq('id', 'office_accounts')
                        .maybeSingle();
                    if (sData && Array.isArray(sData.config)) {
                        settingsList = sData.config.filter(a => a.email.toLowerCase() !== email);
                    }
                    settingsList.push({
                        email,
                        office_name: office,
                        password,
                        updated_at: new Date().toISOString()
                    });

                    const { error: setErr } = await client.from('admin_settings').upsert({
                        id: 'office_accounts',
                        config: settingsList,
                        updated_at: new Date().toISOString()
                    });
                    if (!setErr) savedToSupabase = true;
                } catch (setErr) {
                    console.warn('Failed to upsert office_accounts to admin_settings:', setErr);
                }
            }

            // Always update local storage cache for immediate reactivity and offline support
            const currentList = getLocalOfficeAccounts().filter(a => a.email.toLowerCase() !== email);
            currentList.push({ id: 'acc_' + Date.now(), email, office_name: office, password, updated_at: new Date().toISOString() });
            saveLocalOfficeAccounts(currentList);

            if (savedToSupabase) {
                showToast(`Credentials successfully saved to database for ${office} (${email})!`, 'success');
            } else {
                showToast(`Office credentials saved locally and authorized for ${office} (${email}).`, 'success');
            }

            officeAccountForm.reset();
            await fetchOfficeAccounts();

            submitAccBtn.disabled = false;
            submitAccBtn.innerHTML = 'Save Credentials';
        });
    }

    window.deleteOfficeAccount = async function(id, email) {
        const result = await Swal.fire({
            title: 'Delete Office Account?',
            html: `Are you sure you want to remove <b>${escapeHtml(email)}</b>?<br><span class="text-xs text-slate-500">This account will lose access to the portal immediately.</span>`,
            iconHtml: '<div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-red-100"><i class="fa-solid fa-trash text-2xl"></i></div>',
            customClass: {
                icon: 'border-0 mb-0 w-full',
                popup: 'rounded-3xl shadow-2xl font-sans pb-4 border border-slate-100',
                title: 'text-2xl font-black text-slate-800 tracking-tight mt-2',
                htmlContainer: 'text-slate-500 font-medium mt-2 mb-6 text-sm',
                actions: 'w-full flex justify-center gap-3 mt-6',
                confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl px-8 py-3.5 shadow-md transition-all w-full max-w-[160px] flex items-center justify-center gap-2 cursor-pointer',
                cancelButton: 'bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-8 py-3.5 transition-all border border-slate-200 w-full max-w-[150px] shadow-sm cursor-pointer',
            },
            buttonsStyling: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-trash"></i> Delete',
            cancelButtonText: 'Cancel'
        });
        
        if(!result.isConfirmed) return;
        
        try {
            const client = await getSupabaseClient();
            if (client) {
                if (id && !String(id).startsWith('local_') && !String(id).startsWith('acc_')) {
                    await client.from('office_accounts').delete().eq('id', id);
                }
                if (email) {
                    await client.from('office_accounts').delete().eq('email', email);
                }

                // Also delete from admin_settings
                try {
                    const { data: sData } = await client.from('admin_settings').select('config').eq('id', 'office_accounts').maybeSingle();
                    if (sData && Array.isArray(sData.config)) {
                        const updatedConfig = sData.config.filter(a => a.email && a.email.toLowerCase() !== email.toLowerCase());
                        await client.from('admin_settings').upsert({
                            id: 'office_accounts',
                            config: updatedConfig,
                            updated_at: new Date().toISOString()
                        });
                    }
                } catch (se) {
                    console.warn('Error removing from admin_settings:', se);
                }
            }
        } catch (e) {
            console.warn('Error deleting from Supabase:', e);
        }

        // Clean local storage cache
        const updated = getLocalOfficeAccounts().filter(a => {
            if (id && String(a.id) === String(id)) return false;
            if (email && a.email && a.email.toLowerCase() === email.toLowerCase()) return false;
            return true;
        });
        saveLocalOfficeAccounts(updated);

        showToast(`Office account ${email} removed.`, 'success');
        await fetchOfficeAccounts();
    };



    document.getElementById('refresh-data-btn').addEventListener('click', fetchAdminData);

    (async () => {
        if (localStorage.getItem('isLocalAdmin') === 'true') {
            currentUserRole = 'super_admin';
            currentOfficeScope = null;
            openAdminView();
            fetchAdminData();
            return;
        }

        if (localStorage.getItem('isLocalOfficeUser') === 'true') {
            currentUserRole = 'office';
            currentOfficeScope = localStorage.getItem('localOfficeName') || sessionStorage.getItem('currentOfficeAccount');
            openAdminView();
            fetchAdminData();
            return;
        }

        try {
            const client = await getSupabaseClient();
            if (!client) return;

            const isAdmin = await isCurrentUserAdmin(client);
            if (isAdmin) {
                openAdminView();
                fetchAdminData();
            }

            client.auth.onAuthStateChange(async (_event, session) => {
                if (localStorage.getItem('isLocalAdmin') === 'true') {
                    currentUserRole = 'super_admin';
                    currentOfficeScope = null;
                    openAdminView();
                    fetchAdminData();
                    return;
                }

                if (localStorage.getItem('isLocalOfficeUser') === 'true') {
                    currentUserRole = 'office';
                    currentOfficeScope = localStorage.getItem('localOfficeName') || sessionStorage.getItem('currentOfficeAccount');
                    openAdminView();
                    fetchAdminData();
                    return;
                }

                if (!session) {
                    closeAdminView();
                    return;
                }

                try {
                    const allowed = await isCurrentUserAdmin(client);
                    if (allowed) {
                        openAdminView();
                        fetchAdminData();
                    } else {
                        closeAdminView();
                    }
                } catch (e) {
                    console.warn('Auth change status check failed:', e);
                    closeAdminView();
                }
            });
        } catch (e) {
            console.warn('Supabase auth state listener failed to initialize:', e);
        }
    })();

    // === Form Submissions & Supabase ===

    function generateFeedbackReceiptText(payload = {}, lang = 'en', targetEmail = '') {
        const OFFICIAL_FEEDBACK_EMAIL = 'fredianmherl.masas@bisu.edu.ph';
        const t = (typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : (translations[lang] || translations.en);
        const refCode = 'BISU-CSF-' + Math.random().toString(36).substring(2, 9).toUpperCase();
        const dateStr = payload.created_at 
            ? new Date(payload.created_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleString();

        const officeName = payload.office_visited || document.getElementById('office-visited')?.value || 'General Office';
        const serviceAvailed = payload.service_availed || 'Unspecified';
        const clientType = payload.client_type || 'Client';
        const clientName = (payload.client_name && payload.client_name !== 'Anonymous') 
            ? payload.client_name 
            : ((payload.ratings && payload.ratings.client_name && payload.ratings.client_name !== 'Anonymous') ? payload.ratings.client_name : 'Anonymous');
        const clientEmail = (payload.client_email || (payload.ratings && payload.ratings.client_email) || targetEmail || '').trim();
        const recipientDisplay = (targetEmail || clientEmail || '').trim() || 'Client Copy';
        const servedBy = payload.served_by || (payload.ratings && payload.ratings.served_by) || 'N/A';
        const region = payload.region_of_residence || (payload.ratings && payload.ratings.region_of_residence) || 'N/A';

        // CC mapping
        const cc1Map = {
            1: "1. I know what a CC is and I saw this office's CC.",
            2: "2. I know what a CC is but I did not see this office's CC.",
            3: "3. I learned of the CC only when I saw this office's CC.",
            4: "4. I do not know what a CC is and I did not see one in this office."
        };
        const cc2Map = {
            1: "1. Easy to see",
            2: "2. Somewhat easy to see",
            3: "3. Difficult to see",
            4: "4. Not visible at all",
            5: "5. N/A"
        };
        const cc3Map = {
            1: "Helped very much",
            2: "Somewhat helped",
            3: "Did not help",
            4: "N/A"
        };

        const cc1Text = cc1Map[payload.cc1] || (payload.cc1 ? `Option ${payload.cc1}` : 'N/A');
        const cc2Text = cc2Map[payload.cc2] || (payload.cc2 ? `Option ${payload.cc2}` : 'N/A');
        const cc3Text = cc3Map[payload.cc3] || (payload.cc3 ? `Option ${payload.cc3}` : 'N/A');

        // Dimension breakdown
        const activeDims = (typeof formConfig !== 'undefined' && formConfig && formConfig.dimensions && formConfig.dimensions[lang]) 
            ? formConfig.dimensions[lang] 
            : (defaultDimensions[lang] || defaultDimensions.en);

        const ratingsMap = payload.ratings || {};
        let dimsText = '';
        if (Array.isArray(activeDims)) {
            activeDims.forEach(d => {
                const val = ratingsMap[d.id];
                let valDisplay = 'N/A';
                if (val === 0 || val === '0') {
                    valDisplay = 'N/A (Not Applicable)';
                } else if (val !== undefined && val !== null) {
                    valDisplay = `${val}/5`;
                }
                dimsText += `  * ${d.label}: ${valDisplay}\n`;
            });
        }

        const meanScoreStr = (payload.mean_score !== undefined && payload.mean_score !== null) 
            ? `${payload.mean_score} / 5.00` 
            : 'N/A';

        return `=====================================================
BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS
CUSTOMER SATISFACTION FEEDBACK SUBMISSION RECEIPT
=====================================================
Reference Code    : ${refCode}
Date & Time       : ${dateStr}
Official Sender   : ${OFFICIAL_FEEDBACK_EMAIL} (BISU Feedback System)
Recipient / To    : ${recipientDisplay}
Official Copy CC  : ${OFFICIAL_FEEDBACK_EMAIL}

TRANSACTION DETAILS:
-----------------------------------------------------
Client Name       : ${clientName}
Client Type       : ${clientType}
Office Visited    : ${officeName}
Service Availed   : ${serviceAvailed}
Served By         : ${servedBy}
Region            : ${region}

CITIZEN'S CHARTER (CC) ASSESSMENT:
-----------------------------------------------------
CC1 (Awareness)   : ${cc1Text}
CC2 (Visibility)  : ${cc2Text}
CC3 (Helpfulness) : ${cc3Text}

SERVICE QUALITY EVALUATION RATINGS:
-----------------------------------------------------
${dimsText}Overall Average Score: ${meanScoreStr}

COMMENTS & FEEDBACK:
-----------------------------------------------------
Commendations     : ${payload.commendations || 'None'}
Suggestions       : ${payload.suggestions || 'None'}

=====================================================
Official System Email: ${OFFICIAL_FEEDBACK_EMAIL}
This is an official feedback submission confirmation receipt.
Thank you for helping Bohol Island State University continuously enhance public service delivery.
BISU Calape Campus Portal: https://bisu.edu.ph
=====================================================`;
    }

    function openFeedbackEmailReceipt(payload, recipientEmail, lang = 'en', mode = 'auto') {
        const OFFICIAL_FEEDBACK_EMAIL = 'fredianmherl.masas@bisu.edu.ph';
        const trimmedEmail = (recipientEmail || payload.client_email || (payload.ratings && payload.ratings.client_email) || '').trim();
        const receiptBody = generateFeedbackReceiptText(payload, lang, trimmedEmail);
        const officeName = payload.office_visited || 'BISU Calape';
        const subject = `[BISU Calape CSFS] Feedback Receipt - ${officeName}`;
        
        if (trimmedEmail) {
            try {
                localStorage.setItem('bisu_client_email', trimmedEmail);
            } catch(e) {}
        }

        const isGmail = mode === 'gmail' || (mode === 'auto' && (trimmedEmail.toLowerCase().endsWith('@gmail.com') || trimmedEmail.toLowerCase().endsWith('@googlemail.com')));

        if (isGmail) {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(trimmedEmail)}&cc=${encodeURIComponent(OFFICIAL_FEEDBACK_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(receiptBody)}`;
            window.open(gmailUrl, '_blank', 'noopener,noreferrer');
        } else {
            const mailtoUrl = `mailto:${encodeURIComponent(trimmedEmail)}?cc=${encodeURIComponent(OFFICIAL_FEEDBACK_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(receiptBody)}`;
            const mailLink = document.createElement('a');
            mailLink.href = mailtoUrl;
            mailLink.target = '_blank';
            mailLink.rel = 'noopener noreferrer';
            document.body.appendChild(mailLink);
            mailLink.click();
            setTimeout(() => {
                if (mailLink.parentNode) mailLink.parentNode.removeChild(mailLink);
            }, 150);
        }

        return receiptBody;
    }

    function showFeedbackThankYou(payload = {}, isOffline = false) {
        const OFFICIAL_FEEDBACK_EMAIL = 'fredianmherl.masas@bisu.edu.ph';
        const lang = (typeof currentLang !== 'undefined' && translations[currentLang]) ? currentLang : 'en';
        const t = translations[lang] || translations.en;

        const titleText = t["t-thank-title"] || "Thank you for your feedback!!";
        const descText = t["t-thank-desc"] || "Your feedback has been successfully submitted and recorded.";
        const subText = t["t-thank-sub"] || "Thank you for taking the time to help us enhance the quality and delivery of services at Bohol Island State University.";
        const btnDoneText = t["t-thank-btn-done"] || "Done";
        const btnAnotherText = t["t-thank-btn-another"] || "Submit Another Feedback";

        const officeName = payload.office_visited || document.getElementById('office-visited')?.value || '';
        const serviceAvailed = payload.service_availed || '';
        const clientType = payload.client_type || '';
        const clientName = (payload.client_name && payload.client_name !== 'Anonymous') 
            ? payload.client_name 
            : ((payload.ratings && payload.ratings.client_name && payload.ratings.client_name !== 'Anonymous') ? payload.ratings.client_name : '');
        const dateStr = payload.created_at 
            ? new Date(payload.created_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '';

        let savedClientEmail = '';
        try {
            savedClientEmail = localStorage.getItem('bisu_client_email') || '';
        } catch(e) {}
        const defaultEmail = (payload.client_email || (payload.ratings && payload.ratings.client_email) || savedClientEmail || '').trim();

        const offlineNotice = isOffline ? `
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-center justify-center gap-2">
                <i class="fa-solid fa-cloud-arrow-up text-amber-600"></i>
                <span>Saved offline. Will sync automatically when internet is connected.</span>
            </div>
        ` : '';

        const detailsCard = (clientName || officeName || serviceAvailed || clientType || dateStr) ? `
            <div class="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 text-left text-xs space-y-2 mb-2 shadow-2xs">
                ${clientName ? `
                <div class="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span class="text-slate-500 font-bold uppercase tracking-wider text-[10px]"><i class="fa-solid fa-user mr-1 text-[#22007c]"></i> Client Name</span>
                    <span class="font-extrabold text-[#22007c]">${escapeHtml(clientName)}</span>
                </div>` : ''}
                ${officeName ? `
                <div class="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span class="text-slate-500 font-bold uppercase tracking-wider text-[10px]"><i class="fa-solid fa-building-columns mr-1 text-[#22007c]"></i> Office Visited</span>
                    <span class="font-extrabold text-[#22007c]">${escapeHtml(officeName)}</span>
                </div>` : ''}
                ${serviceAvailed ? `
                <div class="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <span class="text-slate-500 font-bold uppercase tracking-wider text-[10px]"><i class="fa-solid fa-bell-concierge mr-1 text-slate-400"></i> Service Availed</span>
                    <span class="font-semibold text-slate-800">${escapeHtml(serviceAvailed)}</span>
                </div>` : ''}
                ${clientType ? `
                <div class="flex items-center justify-between ${dateStr ? 'border-b border-slate-200/60 pb-1.5' : ''}">
                    <span class="text-slate-500 font-bold uppercase tracking-wider text-[10px]"><i class="fa-solid fa-user-tag mr-1 text-slate-400"></i> Client Type</span>
                    <span class="font-semibold text-slate-800">${escapeHtml(clientType)}</span>
                </div>` : ''}
                ${dateStr ? `
                <div class="flex items-center justify-between">
                    <span class="text-slate-500 font-bold uppercase tracking-wider text-[10px]"><i class="fa-regular fa-calendar-check mr-1 text-slate-400"></i> Date & Time</span>
                    <span class="font-semibold text-slate-800">${escapeHtml(dateStr)}</span>
                </div>` : ''}
            </div>
        ` : '';

        // Email Response Yes/No Option Module
        const emailResponseOptionCard = `
            <div id="email-response-card" class="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200 rounded-2xl p-3.5 text-left text-xs space-y-3 mb-2 shadow-2xs transition-all duration-200">
                <div class="flex items-center justify-between">
                    <span class="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                        <i class="fa-solid fa-envelope text-[#22007c]"></i>
                        <span>${t["t-email-ask"] || "Would you like to email a copy of your response?"}</span>
                    </span>
                </div>

                <!-- Yes / No Choice Buttons -->
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" id="email-opt-yes-btn" class="py-2.5 px-3 rounded-xl border ${defaultEmail ? 'bg-blue-100 border-[#22007c] text-[#22007c] ring-2 ring-blue-400/40' : 'border-blue-300 text-blue-900 bg-white hover:bg-blue-50 hover:border-[#22007c]'} font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                        <i class="fa-solid fa-circle-check text-blue-600 text-xs"></i>
                        <span>${t["t-email-opt-yes"] || "Yes, email my copy"}</span>
                    </button>
                    <button type="button" id="email-opt-no-btn" class="py-2.5 px-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 bg-white hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                        <i class="fa-solid fa-circle-xmark text-slate-400 text-xs"></i>
                        <span>${t["t-email-opt-no"] || "No, thanks"}</span>
                    </button>
                </div>

                <!-- Dynamic Email Input Section (Appears when Yes is clicked or when prefilled) -->
                <div id="email-input-container" class="${defaultEmail ? '' : 'hidden'} pt-2.5 border-t border-blue-200/70 space-y-2.5 animate-fade-in">
                    <div>
                        <label for="feedback-receipt-email" class="block text-[11px] font-bold text-slate-700 mb-1">
                            ${t["t-email-placeholder"] || "Enter your email address..."}
                        </label>
                        <div class="relative">
                            <input type="email" id="feedback-receipt-email" placeholder="e.g. user@gmail.com or email@example.com" value="${escapeHtml(defaultEmail)}" class="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#22007c] shadow-2xs">
                        </div>
                    </div>

                    <div class="flex flex-col gap-1.5 pt-0.5">
                        <div class="flex items-center gap-2">
                            <button type="button" id="btn-send-email-receipt" class="flex-1 bg-[#22007c] hover:bg-[#180058] text-white font-extrabold py-2 px-3 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98">
                                <i class="fa-solid fa-paper-plane text-[11px]"></i>
                                <span id="btn-send-label">${t["t-email-send-btn"] || "Send Email Receipt"}</span>
                            </button>
                            <button type="button" id="btn-gmail-receipt" class="bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-extrabold py-2 px-3 rounded-xl text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98" title="Open directly in Gmail Web">
                                <i class="fa-brands fa-google text-red-500 text-xs"></i>
                                <span>Gmail</span>
                            </button>
                        </div>

                        <button type="button" id="btn-copy-receipt-text" title="Copy receipt text to clipboard" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-xl text-[11px] transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                            <i class="fa-solid fa-copy text-[10px] text-[#22007c]"></i>
                            <span>${t["t-email-copy-btn"] || "Copy Summary Text"}</span>
                        </button>
                    </div>
                    <div id="email-receipt-status" class="text-[11px] text-center font-bold text-slate-600 pt-0.5 hidden"></div>
                </div>
            </div>
        `;

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: `<div class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">${titleText}</div>`,
                html: `
                    <div class="space-y-3 text-center pt-2">
                        <div class="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-xs">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <p class="text-sm font-bold text-slate-800 leading-relaxed">
                            ${descText}
                        </p>
                        ${detailsCard}
                        ${emailResponseOptionCard}
                        <p class="text-xs text-slate-500 font-medium leading-relaxed">
                            ${subText}
                        </p>
                        ${offlineNotice}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: `<i class="fa-solid fa-check mr-1.5"></i> ${btnDoneText}`,
                cancelButtonText: `<i class="fa-solid fa-rotate-left mr-1.5"></i> ${btnAnotherText}`,
                allowOutsideClick: true,
                customClass: {
                    popup: 'rounded-3xl border-t-8 border-[#22007c] shadow-2xl p-5 sm:p-6 max-w-md',
                    confirmButton: 'bg-[#22007c] text-white font-black px-6 py-2.5 rounded-xl hover:bg-[#180058] transition shadow-md text-sm cursor-pointer',
                    cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition text-sm cursor-pointer'
                },
                didOpen: (popup) => {
                    const yesBtn = popup.querySelector('#email-opt-yes-btn');
                    const noBtn = popup.querySelector('#email-opt-no-btn');
                    const container = popup.querySelector('#email-input-container');
                    const emailInput = popup.querySelector('#feedback-receipt-email');
                    const sendBtn = popup.querySelector('#btn-send-email-receipt');
                    const gmailBtn = popup.querySelector('#btn-gmail-receipt');
                    const copyBtn = popup.querySelector('#btn-copy-receipt-text');
                    const statusEl = popup.querySelector('#email-receipt-status');
                    const sendLabel = popup.querySelector('#btn-send-label');

                    if (emailInput) {
                        emailInput.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                sendBtn?.click();
                            }
                        });
                    }

                    if (yesBtn && noBtn && container) {
                        yesBtn.addEventListener('click', () => {
                            container.classList.remove('hidden');
                            yesBtn.classList.add('bg-blue-100', 'border-[#22007c]', 'text-[#22007c]', 'ring-2', 'ring-blue-400/40');
                            yesBtn.classList.remove('bg-white');
                            noBtn.classList.remove('bg-slate-200', 'border-slate-400', 'text-slate-900');
                            noBtn.classList.add('bg-white');
                            if (emailInput) {
                                emailInput.focus();
                            }
                        });

                        noBtn.addEventListener('click', () => {
                            container.classList.add('hidden');
                            noBtn.classList.add('bg-slate-200', 'border-slate-400', 'text-slate-900');
                            noBtn.classList.remove('bg-white');
                            yesBtn.classList.remove('bg-blue-100', 'border-[#22007c]', 'text-[#22007c]', 'ring-2', 'ring-blue-400/40');
                            yesBtn.classList.add('bg-white');
                            if (statusEl) {
                                statusEl.classList.add('hidden');
                                statusEl.textContent = '';
                            }
                        });
                    }

                    const handleEmailDispatch = (mode = 'auto') => {
                        const enteredEmail = (emailInput?.value || '').trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!enteredEmail || !emailRegex.test(enteredEmail)) {
                            if (statusEl) {
                                statusEl.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i> ${t["t-email-invalid"] || "Please enter a valid email address."}</span>`;
                                statusEl.classList.remove('hidden');
                            }
                            emailInput?.focus();
                            return;
                        }

                        openFeedbackEmailReceipt(payload, enteredEmail, lang, mode);

                        if (statusEl) {
                            statusEl.innerHTML = `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-circle-check mr-1 text-emerald-600"></i> ${t["t-email-success-open"] || "Opening email app with feedback receipt..."}</span>`;
                            statusEl.classList.remove('hidden');
                        }
                        showToast(`Prepared response for ${enteredEmail}`, 'info');
                    };

                    if (sendBtn) {
                        sendBtn.addEventListener('click', () => handleEmailDispatch('auto'));
                    }

                    if (gmailBtn) {
                        gmailBtn.addEventListener('click', () => handleEmailDispatch('gmail'));
                    }

                    if (copyBtn) {
                        copyBtn.addEventListener('click', () => {
                            const enteredEmail = (emailInput?.value || '').trim();
                            const receiptText = generateFeedbackReceiptText(payload, lang, enteredEmail);
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(receiptText).then(() => {
                                    if (statusEl) {
                                        statusEl.innerHTML = `<span class="text-emerald-700 font-bold"><i class="fa-solid fa-check mr-1"></i> ${t["t-email-copied"] || "Response summary copied to clipboard!"}</span>`;
                                        statusEl.classList.remove('hidden');
                                    }
                                    showToast(t["t-email-copied"] || "Response summary copied to clipboard!", 'success');
                                }).catch(() => {
                                    showToast("Response summary copied!", "success");
                                });
                            } else {
                                showToast(t["t-email-copied"] || "Response summary copied to clipboard!", 'success');
                            }
                        });
                    }
                }
            }).then(() => {
                resetFeedbackForm();
                // If URL contained office parameter (from QR code), preserve it
                const urlParams = new URLSearchParams(window.location.search);
                const officeParam = urlParams.get('office');
                if (officeParam) {
                    const officeSelect = document.getElementById('office-visited');
                    if (officeSelect) {
                        officeSelect.value = officeParam;
                        const evt = new Event('change', { bubbles: true });
                        officeSelect.dispatchEvent(evt);
                    }
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        } else {
            showToast(titleText, 'success');
            resetFeedbackForm();
        }
    }

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientType = (document.getElementById('client-type').value || '').trim();
        const allowedClientTypes = ['Student', 'Faculty', 'Citizen', 'Business', 'Government'];
        if (!allowedClientTypes.includes(clientType)) {
            showToast('Please select a valid client type.', 'error');
            return;
        }
        
        // Validate Likert Ratings dynamically active
        const activeDims = formConfig.dimensions[currentLang] || formConfig.dimensions['en'];
        for (let d of activeDims) {
            if (currentRatings[d.id] === null || currentRatings[d.id] === undefined) {
                showToast(`Please rate: ${d.label}`, 'error');
                return;
            }
        }

        // Calculate average dynamically (excluding Not Applicable 0 ratings)
        let sum = 0;
        let count = 0;
        for (let d of activeDims) {
            const val = currentRatings[d.id];
            if (val > 0) {
                sum += val;
                count++;
            }
        }
        const meanScore = count > 0 ? (sum / count) : 0;

        const submitBtn = document.getElementById('submit-feedback-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';

        const serviceSelect = document.getElementById('service-availed-select');
        let serviceValue = '';
        if (serviceSelect) {
            if (serviceSelect.value === 'Other') {
                serviceValue = (document.getElementById('service-availed-custom').value || '').trim();
                if (!serviceValue) {
                    showToast('Please specify the custom service availed.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="text-lg">Submit My Feedback</span><i class="fa-solid fa-paper-plane group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>';
                    return;
                }
            } else {
                serviceValue = serviceSelect.value || '';
                if (!serviceValue) {
                    showToast('Please select a service availed.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="text-lg">Submit My Feedback</span><i class="fa-solid fa-paper-plane group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>';
                    return;
                }
            }
        }

        const cc1Value = document.querySelector('input[name="cc1"]:checked')?.value;
        const cc2Value = document.querySelector('input[name="cc2"]:checked')?.value;
        const cc3Value = document.querySelector('input[name="cc3"]:checked')?.value;

        const clientNameInput = document.getElementById('client-name');
        const clientNameValue = clientNameInput ? (clientNameInput.value || '').trim() : '';

        const clientEmailInput = document.getElementById('client-email');
        const clientEmailValue = clientEmailInput ? (clientEmailInput.value || '').trim() : '';
        if (clientEmailValue) {
            try {
                localStorage.setItem('bisu_client_email', clientEmailValue);
            } catch(e) {}
        }

        const servedByInput = document.getElementById('served-by');
        const servedByValue = servedByInput ? (servedByInput.value || '').trim() : null;

        const regionSelect = document.getElementById('client-region');
        const regionValue = regionSelect ? (regionSelect.value || null) : null;

        // User's choice of time and day
        const dateVisitedVal = (document.getElementById('date-visited')?.value || '').trim();
        const timeVisitedVal = (document.getElementById('time-visited')?.value || '').trim();

        let submissionTimestamp = new Date().toISOString();
        if (dateVisitedVal) {
            if (timeVisitedVal) {
                const combinedDate = new Date(`${dateVisitedVal}T${timeVisitedVal}:00`);
                if (!isNaN(combinedDate.getTime())) {
                    submissionTimestamp = combinedDate.toISOString();
                }
            } else {
                const combinedDate = new Date(`${dateVisitedVal}T12:00:00`);
                if (!isNaN(combinedDate.getTime())) {
                    submissionTimestamp = combinedDate.toISOString();
                }
            }
        }

        const ratingsPayload = { 
            ...currentRatings,
            client_name: clientNameValue || null,
            client_email: clientEmailValue || null,
            date_visited: dateVisitedVal || null,
            time_visited: timeVisitedVal || null
        };

        const payload = {
            client_name: clientNameValue || 'Anonymous',
            client_email: clientEmailValue || null,
            office_visited: document.getElementById('office-visited').value,
            service_availed: serviceValue,
            client_type: clientType,
            sex: document.getElementById('client-sex').value || null,
            served_by: servedByValue || null,
            region_of_residence: regionValue || null,
            created_at: submissionTimestamp,
            cc1: parseInt(cc1Value || 0),
            cc2: parseInt(cc2Value || 0),
            cc3: parseInt(cc3Value || 0),
            ratings: ratingsPayload,
            mean_score: parseFloat(meanScore.toFixed(2)),
            commendations: document.getElementById('commendations').value || null,
            suggestions: document.getElementById('suggestions').value || null
        };

        try {
            const client = await getSupabaseClient();
            if (navigator.onLine && client) {
                const result = await insertEvaluations(client, [payload]);
                if (result && result.error) throw result.error;
                showFeedbackThankYou(payload, false);
            } else {
                saveOffline('pendingFeedbacks', payload);
                showFeedbackThankYou(payload, true);
            }
        } catch (error) {
            console.error('Feedback insert failed:', error);
            saveOffline('pendingFeedbacks', payload);
            showFeedbackThankYou(payload, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="text-lg">Submit My Feedback</span><i class="fa-solid fa-paper-plane group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"></i>';
        }
    });

    // CC Questions Logic
    document.querySelectorAll('input[name="cc1"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateCitizenCharterState();
        });
    });

    document.querySelectorAll('input[name="cc2"], input[name="cc3"]').forEach(radio => {
        radio.addEventListener('change', () => {
            checkFormCompletion();
        });
    });

    if (feedbackForm) {
        feedbackForm.addEventListener('input', checkFormCompletion);
        feedbackForm.addEventListener('change', checkFormCompletion);
    }

    complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-complaint-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting...';
        }

        const payload = {
            office_of: document.getElementById('comp-office-header')?.value || document.getElementById('comp-place')?.value || 'General Office',
            person_complained_of: document.getElementById('comp-person-complained-of')?.value || '',
            name: document.getElementById('comp-name')?.value || 'Anonymous',
            address: document.getElementById('comp-address')?.value || null,
            sex: document.getElementById('comp-sex')?.value || null,
            age: parseInt(document.getElementById('comp-age')?.value) || null,
            civil_status: document.getElementById('comp-civil-status')?.value || null,
            contact_details: document.getElementById('comp-contact')?.value || null,
            date_of_incident: document.getElementById('comp-date')?.value || null,
            time_of_incident: document.getElementById('comp-time')?.value || null,
            place_of_incident: document.getElementById('comp-place')?.value || null,
            details_of_complaint: document.getElementById('comp-details')?.value || '',
            narrative_report: document.getElementById('comp-narrative')?.value || '',
            proof_of_complaint: document.getElementById('comp-proof')?.value || null,
            attachment: typeof compAttachmentData !== 'undefined' ? compAttachmentData : null,
            desired_outcome: document.getElementById('comp-outcome')?.value || '',
            signature_name: document.getElementById('comp-signature-name')?.value || document.getElementById('comp-name')?.value || 'Anonymous',
            created_at: new Date().toISOString()
        };

        const handleSuccessAndConfirm = (isOffline = false) => {
            const statusMsg = isOffline ? 'Saved offline. Will sync automatically once reconnected.' : 'Forwarded to Quality Assurance & Administration.';
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Complaint Filed Successfully',
                    html: `
                        <div class="space-y-3 text-center">
                            <p class="text-sm text-slate-600 font-medium leading-relaxed">
                                ${statusMsg}
                            </p>
                            <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-left text-xs text-red-900 space-y-1">
                                <div><strong>Ref Code:</strong> F-AQA-CSF-004 Rev. 2</div>
                                <div><strong>Office Concerned:</strong> ${escapeHtml(payload.office_of || payload.place_of_incident)}</div>
                                <div><strong>Person / Subject:</strong> ${escapeHtml(payload.person_complained_of || payload.details_of_complaint)}</div>
                                <div><strong>Incident Date:</strong> ${escapeHtml(payload.date_of_incident || 'Unspecified')}</div>
                            </div>
                        </div>
                    `,
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fa-solid fa-print mr-1"></i> Print / Save Copy',
                    cancelButtonText: 'Done & Return',
                    customClass: {
                        popup: 'rounded-2xl border-t-8 border-red-600 shadow-2xl',
                        confirmButton: 'bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-red-700 transition shadow-md',
                        cancelButton: 'bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-200 transition'
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        printOfficialComplaintForm(payload);
                    }
                    if (complaintForm) complaintForm.reset();
                    const compAttachmentFilename = document.getElementById('comp-attachment-filename');
                    if (compAttachmentFilename) compAttachmentFilename.textContent = 'No file selected';
                    compAttachmentData = null;
                    if (backToFeedbackBtn) backToFeedbackBtn.click();
                });
            } else {
                showToast(statusMsg, 'success');
                if (complaintForm) complaintForm.reset();
                if (backToFeedbackBtn) backToFeedbackBtn.click();
            }
        };

        try {
            const client = await getSupabaseClient();
            if (navigator.onLine && client) {
                const { error } = await client.from(COMPLAIN_TABLE).insert([payload]);
                if (error) throw error;
                handleSuccessAndConfirm(false);
            } else {
                saveOffline('pendingComplaints', payload);
                handleSuccessAndConfirm(true);
            }
        } catch (error) {
            console.error('Complaint insert failed:', error);
            saveOffline('pendingComplaints', payload);
            handleSuccessAndConfirm(true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Submit Formal Complaint';
            }
        }
    });

    // === Official Complaint Form Printing (F-AQA-CSF-004 Rev. 2) ===
    function printOfficialComplaintForm(c) {
        const bisuLogo = (typeof cachedLogos !== 'undefined' && cachedLogos.bisu) ? cachedLogos.bisu : new URL('images/BISU.webp', window.location.origin).href;
        const bagongPilipinasLogo = (typeof cachedLogos !== 'undefined' && cachedLogos.bagongPilipinas) ? cachedLogos.bagongPilipinas : new URL('images/BAGONG-PILIPINAS-LOGO-1-1.webp', window.location.origin).href;
        const tuvLogo = (typeof cachedLogos !== 'undefined' && cachedLogos.tuv) ? cachedLogos.tuv : new URL('images/images.webp', window.location.origin).href;

        const isAnon = !c.name || c.name.trim().toLowerCase() === 'anonymous' || c.name.trim() === '';
        const nameDisplay = isAnon ? 'ANONYMOUS COMPLAINANT' : escapeHtml(c.name);
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();

        const printHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>COMPLAINT FORM - ${escapeHtml(c.office_of || c.place_of_incident || 'BISU Calape')}</title>
                <style>
                    @page { size: portrait; margin: 10mm 12mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 15px; font-size: 11px; line-height: 1.4; }
                    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
                    .header-table td { vertical-align: middle; }
                    .logo-cell { width: 15%; text-align: center; }
                    .logo-cell img { max-height: 65px; width: auto; object-fit: contain; }
                    .title-cell { text-align: center; }
                    .title-cell p { margin: 1px 0; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #334155; }
                    .title-cell h1 { margin: 2px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #000; }
                    .office-line { font-weight: 800; font-size: 12px; margin-top: 4px; text-decoration: underline; color: #000; }
                    .motto { font-style: italic; font-size: 9px; font-weight: bold; color: #475569; margin-top: 2px; }
                    .form-title { text-align: center; font-size: 16px; font-weight: 900; margin: 10px 0; text-transform: uppercase; letter-spacing: 1px; text-decoration: underline; color: #b91c1c; }
                    .intro-box { border: 1px solid #cbd5e1; padding: 8px; font-size: 10px; margin-bottom: 12px; text-align: justify; background: #f8fafc; border-radius: 4px; }
                    .section-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000; }
                    .section-header { background: #0f172a; color: #fff; font-weight: 800; padding: 5px 8px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
                    .field-label { font-weight: 700; text-transform: uppercase; font-size: 10px; background: #f1f5f9; padding: 5px 8px; border: 1px solid #cbd5e1; width: 25%; }
                    .field-value { padding: 5px 8px; border: 1px solid #cbd5e1; font-size: 10px; }
                    .narrative-box { border: 1px solid #000; padding: 8px; min-height: 60px; margin-bottom: 10px; white-space: pre-wrap; font-size: 10px; background: #fff; }
                    .pledge-box { border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-size: 10px; line-height: 1.4; background: #fafafa; }
                    .signature-grid { width: 100%; border-collapse: collapse; margin-top: 30px; }
                    .signature-cell { width: 50%; text-align: center; vertical-align: bottom; }
                    .sig-line { border-top: 1px solid #000; width: 80%; margin: 0 auto; padding-top: 3px; font-weight: bold; font-size: 9px; text-transform: uppercase; }
                    .doc-footer { display: flex; justify-content: space-between; font-family: monospace; font-size: 9px; font-weight: bold; color: #64748b; margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 4px; }
                </style>
            </head>
            <body>
                <table class="header-table">
                    <tr>
                        <td class="logo-cell"><img src="${bisuLogo}" alt="BISU Logo"></td>
                        <td class="title-cell">
                            <p>Republic of the Philippines</p>
                            <h1>BOHOL ISLAND STATE UNIVERSITY</h1>
                            <p>Calape Campus, Bohol, Philippines</p>
                            <div class="office-line">Office of the ${escapeHtml(c.office_of || c.place_of_incident || '_______________')}</div>
                            <div class="motto">Balance | Integrity | Stewardship | Uprightness</div>
                        </td>
                        <td class="logo-cell" style="width: 20%;">
                            <img src="${bagongPilipinasLogo}" style="max-height: 45px; margin-right: 4px;" alt="Bagong Pilipinas">
                            <img src="${tuvLogo}" style="max-height: 45px;" alt="TUV Rheinland">
                        </td>
                    </tr>
                </table>

                <div class="form-title">COMPLAINT FORM</div>

                <div class="intro-box">
                    The Customer Satisfaction Feedback Complaint Form shall be given to any client who is experiencing dissatisfaction with the services rendered by the unit/office to take necessary actions whenever there is a need to. Please fill out this form with the needed data/information. Rest assured that the data/information gathered will be handled with confidentiality which is in accordance with the <strong>DATA PRIVACY ACT</strong>.
                </div>

                <table class="section-table">
                    <tr>
                        <td class="field-label" style="width: 32%;">NAME OF PERSON COMPLAINT OF :</td>
                        <td class="field-value" style="font-weight: bold; font-size: 11px; color: #b91c1c;">${escapeHtml(c.person_complained_of || c.details_of_complaint || 'N/A')}</td>
                    </tr>
                </table>

                <div class="section-header">DETAILS OF THE COMPLAINANT</div>
                <table class="section-table">
                    <tr>
                        <td class="field-label">Name of Complainant</td>
                        <td class="field-value" colspan="3">${nameDisplay}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Address</td>
                        <td class="field-value" colspan="3">${escapeHtml(c.address || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Sex</td>
                        <td class="field-value">${escapeHtml(c.sex || 'N/A')}</td>
                        <td class="field-label">Age</td>
                        <td class="field-value">${escapeHtml(c.age || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Civil Status</td>
                        <td class="field-value">${escapeHtml(c.civil_status || 'N/A')}</td>
                        <td class="field-label">Contact Details</td>
                        <td class="field-value">${escapeHtml(c.contact_details || 'N/A')}</td>
                    </tr>
                </table>

                <div class="section-header">COMPLAINT DETAILS</div>
                <table class="section-table">
                    <tr>
                        <td class="field-label">Date of Incident</td>
                        <td class="field-value">${escapeHtml(c.date_of_incident || 'N/A')}</td>
                        <td class="field-label">Time</td>
                        <td class="field-value">${escapeHtml(c.time_of_incident || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Place of Incident</td>
                        <td class="field-value" colspan="3">${escapeHtml(c.place_of_incident || 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="field-label">Act/s Complained of</td>
                        <td class="field-value" colspan="3" style="font-weight: bold;">${escapeHtml(c.details_of_complaint || 'N/A')}</td>
                    </tr>
                </table>

                <div class="section-header">NARRATIVE REPORT OF COMPLAINT</div>
                <div class="narrative-box">${escapeHtml(c.narrative_report || 'No narrative report provided.')}</div>

                <div class="section-header">PROOF OF COMPLAINT <span style="font-weight: normal; font-size: 9px;">(Document/s / Evidence/s / Witness/es)</span></div>
                <div class="narrative-box" style="min-height: 45px;">${escapeHtml(c.proof_of_complaint || 'None specified.')}</div>

                <div class="section-header">COMPLAINT OUTCOME <span style="font-weight: normal; font-size: 9px;">(Desired outcome or expected resolution)</span></div>
                <div class="narrative-box" style="min-height: 45px;">${escapeHtml(c.desired_outcome || 'None specified.')}</div>

                <div class="pledge-box">
                    <strong>Legal Pledge:</strong> Upon filling-up this form, I bind myself to stand on the truth of this complaint as a <strong>COMPLAINANT/AGGRIEVED PARTY</strong> on behalf of the public and the institution for legal proceedings may be required as provided by the existing laws.<br><br>
                    <strong>Terms of Agreement:</strong> I agree that the provided information asked herein will be used by the University for whatever legal purpose it may serve.
                </div>

                <table class="signature-grid">
                    <tr>
                        <td class="signature-cell">
                            <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase; margin-bottom: 2px;">${escapeHtml(c.signature_name || c.name || 'Anonymous')}</div>
                            <div class="sig-line">Signature over Printed Name of the Complainant</div>
                        </td>
                        <td class="signature-cell">
                            <div style="font-weight: bold; margin-bottom: 2px;">${dateStr}</div>
                            <div class="sig-line">(Date)</div>
                        </td>
                    </tr>
                </table>

                <div class="doc-footer">
                    <span>F-AQA-CSF-004 | Rev. 2 | 07/01/24</span>
                    <span>Page 1 of 1</span>
                </div>
            </body>
            </html>
        `;

        if (typeof printWindowOrIframe === 'function') {
            printWindowOrIframe(printHtml);
        } else {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(printHtml);
                win.document.close();
                win.focus();
                setTimeout(() => win.print(), 500);
            }
        }
    }

    // === Helper Functions ===

    function resetFeedbackForm() {
        feedbackForm.reset();
        document.querySelectorAll('.likert-btn').forEach(btn => btn.classList.remove('selected'));
        for (let dim in currentRatings) {
            currentRatings[dim] = null;
        }
        updateCitizenCharterState();

        const customServiceContainer = document.getElementById('custom-service-container');
        const customInput = document.getElementById('service-availed-custom');
        if (customServiceContainer) customServiceContainer.classList.add('hidden');
        if (customInput) {
            customInput.required = false;
            customInput.value = '';
        }

        const officeSelect = document.getElementById('office-visited');
        if (officeSelect) {
            updateServiceOptions(officeSelect.value);
        }

        initDateTimeInputs();
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        const config = {
            success: { bg: 'bg-emerald-600/95', icon: 'fa-circle-check',  label: 'Success' },
            error:   { bg: 'bg-red-600/95',     icon: 'fa-circle-xmark',  label: 'Error' },
            warning: { bg: 'bg-amber-500/95',    icon: 'fa-triangle-exclamation', label: 'Warning' },
            info:    { bg: 'bg-slate-800/95',    icon: 'fa-circle-info',   label: 'Info' }
        };

        const c = config[type] || config.info;

        toast.className = `px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-medium text-white text-sm max-w-sm toast-enter ${c.bg}`;
        toast.style.backdropFilter = 'blur(12px)';
        toast.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <i class="fa-solid ${c.icon} text-base"></i>
            </div>
            <div class="flex-grow min-w-0">
                <div class="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">${c.label}</div>
                <div class="text-sm leading-snug">${message}</div>
            </div>
            <button onclick="this.parentElement.classList.replace('toast-enter','toast-leave');setTimeout(()=>this.parentElement.remove(),300)" class="ml-2 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.replace('toast-enter', 'toast-leave');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4500);
    }

    // Offline Storage Logic
    function saveOffline(key, data) {
        let items = JSON.parse(localStorage.getItem(key)) || [];
        items.push(data);
        localStorage.setItem(key, JSON.stringify(items));
    }

    async function syncOfflineData() {
        const client = await getSupabaseClient();
        if (!navigator.onLine || !client) return;

        const pFeedbacks = JSON.parse(localStorage.getItem('pendingFeedbacks')) || [];
        if (pFeedbacks.length > 0) {
            const result = await insertEvaluations(client, pFeedbacks);
            if (result && !result.error) {
                localStorage.removeItem('pendingFeedbacks');
                showToast('Offline feedbacks synced!', 'success');
                if (typeof fetchAdminData === 'function' && document.getElementById('admin-dashboard') && !document.getElementById('admin-dashboard').classList.contains('hidden')) {
                    fetchAdminData();
                }
            } else {
                const err = result ? result.error : { message: 'unknown sync error' };
                console.error('Offline feedback sync failed:', err);
                showToast(`Offline feedback sync failed: ${err.message}`, 'error');
            }
        }

        const pComplaints = JSON.parse(localStorage.getItem('pendingComplaints')) || [];
        if (pComplaints.length > 0) {
            const { error } = await client.from(COMPLAIN_TABLE).insert(pComplaints);
            if (!error) {
                localStorage.removeItem('pendingComplaints');
                showToast('Offline complaints synced!', 'success');
                if (typeof fetchAdminData === 'function' && document.getElementById('admin-dashboard') && !document.getElementById('admin-dashboard').classList.contains('hidden')) {
                    fetchAdminData();
                }
            } else {
                console.error('Offline complaint sync failed:', error);
                showToast(`Offline complaint sync failed: ${error.message}`, 'error');
            }
        }
    }

    window.addEventListener('online', syncOfflineData);

    // === Admin Logic ===
    // === Admin Settings Modal Logic ===
    const adminSettingsModal = document.getElementById('admin-settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const configOffices = document.getElementById('config-offices');
    const configDimensionsList = document.getElementById('config-dimensions-list');
    const addDimensionBtn = document.getElementById('add-dimension-btn');

    let tempSettingsOffices = [];
    let tempSettingsDimensions = { en: [], tl: [], ceb: [] };
    let selectedSettingsLang = 'en';

    // Tab switching inside Form Settings
    const tabBtnOffices = document.getElementById('tab-btn-offices');
    const tabBtnQuestions = document.getElementById('tab-btn-questions');
    const paneOffices = document.getElementById('settings-pane-offices');
    const paneQuestions = document.getElementById('settings-pane-questions');

    if (tabBtnOffices && tabBtnQuestions && paneOffices && paneQuestions) {
        tabBtnOffices.addEventListener('click', () => {
            tabBtnOffices.className = 'settings-tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer bg-bisu-blue text-white shadow-sm flex items-center';
            tabBtnQuestions.className = 'settings-tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer text-slate-600 hover:bg-slate-200/60 flex items-center';
            paneOffices.classList.remove('hidden');
            paneQuestions.classList.add('hidden');
        });

        tabBtnQuestions.addEventListener('click', () => {
            tabBtnQuestions.className = 'settings-tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer bg-bisu-blue text-white shadow-sm flex items-center';
            tabBtnOffices.className = 'settings-tab-btn px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer text-slate-600 hover:bg-slate-200/60 flex items-center';
            paneQuestions.classList.remove('hidden');
            paneOffices.classList.add('hidden');
        });
    }

    // Toggle Bulk Offices Textarea
    const toggleBulkBtn = document.getElementById('toggle-bulk-offices-btn');
    const bulkWrapper = document.getElementById('bulk-offices-wrapper');
    if (toggleBulkBtn && bulkWrapper) {
        toggleBulkBtn.addEventListener('click', () => {
            bulkWrapper.classList.toggle('hidden');
            if (!bulkWrapper.classList.contains('hidden') && configOffices) {
                configOffices.value = tempSettingsOffices.join('\n');
                configOffices.focus();
            }
        });
    }

    if (configOffices) {
        configOffices.addEventListener('input', () => {
            const lines = configOffices.value.split('\n').map(o => o.trim()).filter(o => o !== '');
            tempSettingsOffices = lines;
            renderInteractiveOfficesList();
        });
    }

    // Interactive Offices Renderer
    function renderInteractiveOfficesList() {
        const listContainer = document.getElementById('interactive-offices-list');
        const countBadge = document.getElementById('settings-offices-count');
        if (countBadge) countBadge.textContent = tempSettingsOffices.length;

        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (tempSettingsOffices.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-6 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs italic">
                    No offices configured yet. Use the input field above or quick presets to add campus offices.
                </div>
            `;
            return;
        }

        tempSettingsOffices.forEach((office, idx) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center gap-2 p-2 sm:p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/80 transition group';
            
            const isFirst = idx === 0;
            const isLast = idx === tempSettingsOffices.length - 1;

            itemDiv.innerHTML = `
                <span class="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
                <input type="text" class="office-item-input flex-grow bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-bisu-blue focus:border-bisu-blue shadow-2xs" value="${escapeHtml(office)}" data-idx="${idx}">
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" class="move-office-up-btn p-1.5 text-slate-400 hover:text-bisu-blue ${isFirst ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}" data-idx="${idx}" ${isFirst ? 'disabled' : ''} title="Move Up">
                        <i class="fa-solid fa-chevron-up text-xs"></i>
                    </button>
                    <button type="button" class="move-office-down-btn p-1.5 text-slate-400 hover:text-bisu-blue ${isLast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}" data-idx="${idx}" ${isLast ? 'disabled' : ''} title="Move Down">
                        <i class="fa-solid fa-chevron-down text-xs"></i>
                    </button>
                    <button type="button" class="delete-office-btn p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer ml-1" data-idx="${idx}" title="Remove Office">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            `;

            listContainer.appendChild(itemDiv);
        });

        // Add Listeners
        document.querySelectorAll('.office-item-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                const val = e.target.value.trim();
                if (val) {
                    tempSettingsOffices[idx] = val;
                } else {
                    tempSettingsOffices.splice(idx, 1);
                }
                renderInteractiveOfficesList();
                if (configOffices) configOffices.value = tempSettingsOffices.join('\n');
            });
        });

        document.querySelectorAll('.move-office-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                if (idx > 0) {
                    const item = tempSettingsOffices.splice(idx, 1)[0];
                    tempSettingsOffices.splice(idx - 1, 0, item);
                    renderInteractiveOfficesList();
                    if (configOffices) configOffices.value = tempSettingsOffices.join('\n');
                }
            });
        });

        document.querySelectorAll('.move-office-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                if (idx < tempSettingsOffices.length - 1) {
                    const item = tempSettingsOffices.splice(idx, 1)[0];
                    tempSettingsOffices.splice(idx + 1, 0, item);
                    renderInteractiveOfficesList();
                    if (configOffices) configOffices.value = tempSettingsOffices.join('\n');
                }
            });
        });

        document.querySelectorAll('.delete-office-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                tempSettingsOffices.splice(idx, 1);
                renderInteractiveOfficesList();
                if (configOffices) configOffices.value = tempSettingsOffices.join('\n');
            });
        });

        if (configOffices && bulkWrapper && !bulkWrapper.classList.contains('hidden')) {
            configOffices.value = tempSettingsOffices.join('\n');
        }
    }

    // Add Office Functionality
    function addSingleOffice(name) {
        const cleanName = (name || '').trim();
        if (!cleanName) return;
        if (tempSettingsOffices.includes(cleanName)) {
            showToast(`"${cleanName}" is already in the offices list.`, 'info');
            return;
        }
        tempSettingsOffices.push(cleanName);
        renderInteractiveOfficesList();
        showToast(`Added "${cleanName}"`, 'success');
    }

    const addOfficeBtn = document.getElementById('add-office-btn');
    const newOfficeInput = document.getElementById('new-office-input');

    if (addOfficeBtn && newOfficeInput) {
        addOfficeBtn.addEventListener('click', () => {
            addSingleOffice(newOfficeInput.value);
            newOfficeInput.value = '';
            newOfficeInput.focus();
        });

        newOfficeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addOfficeBtn.click();
            }
        });
    }

    // Preset Buttons
    document.querySelectorAll('.preset-office-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const officeName = e.currentTarget.getAttribute('data-name');
            addSingleOffice(officeName);
        });
    });

    function syncCurrentDimensionInputs() {
        if (!configDimensionsList) return;
        const labels = document.querySelectorAll('.dim-label');
        const descs = document.querySelectorAll('.dim-desc');

        labels.forEach((labelInput, idx) => {
            const targetId = labelInput.getAttribute('data-id');
            ['en', 'tl', 'ceb'].forEach(lang => {
                if (tempSettingsDimensions[lang]) {
                    let targetDim = tempSettingsDimensions[lang].find(d => d.id === targetId);
                    if (targetDim) {
                        if (lang === 'en' || !targetDim.label) {
                            targetDim.label = labelInput.value;
                        }
                        if (lang === 'en' || !targetDim.desc) {
                            targetDim.desc = descs[idx] ? descs[idx].value : targetDim.desc;
                        }
                    }
                }
            });
        });
    }

    function switchDimensionLanguage(lang) {
        syncCurrentDimensionInputs();
        selectedSettingsLang = lang || 'en';
        buildSettingsEditor();
    }

    function buildSettingsEditor() {
        if (!configDimensionsList) return;
        configDimensionsList.innerHTML = '';

        const currentList = tempSettingsDimensions[selectedSettingsLang] || [];
        const dimsCountBadge = document.getElementById('settings-dims-count');
        if (dimsCountBadge) dimsCountBadge.textContent = currentList.length;

        currentList.forEach((dim, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === currentList.length - 1;

            const dimCard = document.createElement('div');
            dimCard.className = 'bg-slate-50/90 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-2xs relative transition hover:shadow-xs space-y-3';
            dimCard.innerHTML = `
                <div class="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div class="flex items-center gap-2">
                        <span class="w-6 h-6 rounded-lg bg-bisu-blue text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">${idx + 1}</span>
                        <span class="text-xs font-bold text-slate-700">Question Dimension #${idx + 1}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" class="move-dim-up-btn p-1.5 text-slate-400 hover:text-bisu-blue ${isFirst ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}" data-id="${dim.id}" ${isFirst ? 'disabled' : ''} title="Move Question Up">
                            <i class="fa-solid fa-chevron-up text-xs"></i>
                        </button>
                        <button type="button" class="move-dim-down-btn p-1.5 text-slate-400 hover:text-bisu-blue ${isLast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}" data-id="${dim.id}" ${isLast ? 'disabled' : ''} title="Move Question Down">
                            <i class="fa-solid fa-chevron-down text-xs"></i>
                        </button>
                        <button type="button" class="delete-dim-btn p-1.5 text-rose-500 hover:text-rose-700 transition cursor-pointer ml-1" data-id="${dim.id}" title="Remove Question">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Title / Question Label</label>
                        <input type="text" class="dim-label w-full border border-slate-300 bg-white rounded-xl p-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-bisu-blue focus:border-bisu-blue shadow-2xs" data-id="${dim.id}" value="${escapeHtml(dim.label)}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-600 mb-1">Description / Guidance Text</label>
                        <textarea class="dim-desc w-full border border-slate-300 bg-white rounded-xl p-2.5 text-xs text-slate-600 focus:ring-bisu-blue focus:border-bisu-blue shadow-2xs" data-id="${dim.id}" rows="2">${escapeHtml(dim.desc)}</textarea>
                    </div>
                </div>
            `;

            configDimensionsList.appendChild(dimCard);
        });

        // Question Reordering & Deletion Listeners
        document.querySelectorAll('.move-dim-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                syncCurrentDimensionInputs();
                const targetId = e.currentTarget.getAttribute('data-id');
                ['en', 'tl', 'ceb'].forEach(lang => {
                    const list = tempSettingsDimensions[lang];
                    const idx = list.findIndex(d => d.id === targetId);
                    if (idx > 0) {
                        const item = list.splice(idx, 1)[0];
                        list.splice(idx - 1, 0, item);
                    }
                });
                buildSettingsEditor();
            });
        });

        document.querySelectorAll('.move-dim-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                syncCurrentDimensionInputs();
                const targetId = e.currentTarget.getAttribute('data-id');
                ['en', 'tl', 'ceb'].forEach(lang => {
                    const list = tempSettingsDimensions[lang];
                    const idx = list.findIndex(d => d.id === targetId);
                    if (idx !== -1 && idx < list.length - 1) {
                        const item = list.splice(idx, 1)[0];
                        list.splice(idx + 1, 0, item);
                    }
                });
                buildSettingsEditor();
            });
        });

        document.querySelectorAll('.delete-dim-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                syncCurrentDimensionInputs();
                const targetId = e.currentTarget.getAttribute('data-id');
                ['en', 'tl', 'ceb'].forEach(lang => {
                    if (tempSettingsDimensions[lang]) {
                        tempSettingsDimensions[lang] = tempSettingsDimensions[lang].filter(d => d.id !== targetId);
                    }
                });
                buildSettingsEditor();
            });
        });
    }

    if (addDimensionBtn) {
        addDimensionBtn.addEventListener('click', () => {
            syncCurrentDimensionInputs();
            const newId = 'custom_' + Date.now();
            const newDimEn = { id: newId, icon: 'fa-circle-question', label: 'New Question', desc: 'Enter question guidance here.' };
            const newDimTl = { id: newId, icon: 'fa-circle-question', label: 'Bagong Tanong', desc: 'Ipasok ang paglalarawan dito.' };
            const newDimCeb = { id: newId, icon: 'fa-circle-question', label: 'Bag-ong Pangutana', desc: 'Isulod ang pagpasabut dinhi.' };

            tempSettingsDimensions['en'].push(newDimEn);
            tempSettingsDimensions['tl'].push(newDimTl);
            tempSettingsDimensions['ceb'].push(newDimCeb);

            buildSettingsEditor();

            setTimeout(() => {
                if (configDimensionsList) configDimensionsList.scrollTop = configDimensionsList.scrollHeight;
            }, 50);
        });
    }

    // Reset Defaults Button
    const resetDefaultsBtn = document.getElementById('reset-settings-defaults-btn');
    if (resetDefaultsBtn) {
        resetDefaultsBtn.addEventListener('click', async () => {
            const result = await Swal.fire({
                title: 'Restore Default Form Settings?',
                text: 'This will reset offices and rating dimensions back to standard university defaults.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Restore Defaults',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#1E3A8A'
            });

            if (result.isConfirmed) {
                const defaults = getDefaultFormConfig();
                tempSettingsOffices = [...defaults.offices];
                tempSettingsDimensions = JSON.parse(JSON.stringify(defaults.dimensions));
                renderInteractiveOfficesList();
                buildSettingsEditor();
                showToast('Restored default form settings.', 'info');
            }
        });
    }

    // Open Form Settings Drawer
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            tempSettingsOffices = [...formConfig.offices];
            tempSettingsDimensions = JSON.parse(JSON.stringify(formConfig.dimensions));
            selectedSettingsLang = 'en';

            if (configOffices) configOffices.value = tempSettingsOffices.join('\n');
            renderInteractiveOfficesList();
            switchDimensionLanguage('en');

            adminSettingsModal.classList.remove('hidden');
            adminSettingsModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            adminSettingsModal.classList.add('hidden');
            adminSettingsModal.classList.remove('flex');
            document.body.style.overflow = '';
        });
    }

    if (adminSettingsModal) {
        adminSettingsModal.addEventListener('click', (e) => {
            if (e.target === adminSettingsModal && closeSettingsBtn) {
                closeSettingsBtn.click();
            }
        });
    }

    // Save Form Settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving Settings...';

            try {
                syncCurrentDimensionInputs();

                if (tempSettingsOffices.length === 0) {
                    showToast('Please specify at least one campus office.', 'error');
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Changes';
                    return;
                }

                if (tempSettingsDimensions['en'].length === 0) {
                    showToast('Please configure at least one rating question.', 'error');
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Changes';
                    return;
                }

                formConfig.offices = [...tempSettingsOffices];
                formConfig.dimensions = JSON.parse(JSON.stringify(tempSettingsDimensions));

                formConfig = normalizeFormConfig(formConfig);
                localStorage.setItem('bisuFormConfig', JSON.stringify(formConfig));

                const client = await getSupabaseClient();
                if (client) {
                    const { error } = await client.from('admin_settings').upsert({
                        id: 'global_config',
                        config: formConfig,
                        updated_at: new Date().toISOString()
                    });
                    if (error) console.warn('Supabase admin_settings upsert issue:', error);
                }

                showToast('Form Settings Updated Successfully!', 'success');
                adminSettingsModal.classList.add('hidden');
                adminSettingsModal.classList.remove('flex');
                document.body.style.overflow = '';

                // Re-render Form Dynamic Fields and Likert Rating Scales
                renderDynamicFields();
                renderLikertScales();
            } catch (error) {
                showToast('Error saving form settings.', 'error');
                console.error(error);
            } finally {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Changes';
            }
        });
    }

    if(manageRecipientsBtn) {
        manageRecipientsBtn.addEventListener('click', () => {
            tempRecipients = (formConfig.recipients || []).map(r => {
                const parts = r.split('|');
                if (parts.length >= 2) return { name: parts[0].trim(), email: parts[1].trim() };
                return { name: r.trim(), email: '' }; // Fallback
            }).filter(r => r.name !== '' || r.email !== '');
            
            renderRecipientsList();
            
            if (manageRecipientsModal) {
                manageRecipientsModal.classList.remove('hidden');
                manageRecipientsModal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    if(closeRecipientsBtn) {
        closeRecipientsBtn.addEventListener('click', () => {
            if (manageRecipientsModal) {
                manageRecipientsModal.classList.add('hidden');
                manageRecipientsModal.classList.remove('flex');
                document.body.style.overflow = '';
            }
        });
    }

    if(manageRecipientsModal) {
        manageRecipientsModal.addEventListener('click', (e) => {
            if (e.target === manageRecipientsModal && closeRecipientsBtn) {
                closeRecipientsBtn.click();
            }
        });
    }

    if(saveRecipientsBtn) {
        saveRecipientsBtn.addEventListener('click', async () => {
            saveRecipientsBtn.disabled = true;
            saveRecipientsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';
            
            try {
                const parsedRecips = tempRecipients
                    .filter(r => r.name.trim() !== '' && r.email.trim() !== '')
                    .map(r => `${r.name.trim()} | ${r.email.trim()}`);
                
                formConfig.recipients = parsedRecips;
                formConfig = normalizeFormConfig(formConfig);
                localStorage.setItem('bisuFormConfig', JSON.stringify(formConfig));
                
                const client = await getSupabaseClient();
                if(client) {
                    await client.from('admin_settings').upsert({
                        id: 'global_config',
                        config: formConfig,
                        updated_at: new Date().toISOString()
                    });
                }
                
                showToast('Email Recipients Updated', 'success');
                manageRecipientsModal.classList.add('hidden');
                manageRecipientsModal.classList.remove('flex');
                document.body.style.overflow = '';
            } catch(e) {
                showToast('Failed to save recipients: ' + e.message, 'error');
            } finally {
                saveRecipientsBtn.disabled = false;
                saveRecipientsBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save Recipients';
            }
        });
    }

    function setDbConnectionBadge(state, detail) {
        const badge = document.getElementById('db-connection-badge');
        const detailEl = document.getElementById('db-connection-detail');
        if (badge) {
            const styles = {
                syncing: ['SYNCING', 'bg-amber-50 text-amber-700 border border-amber-200'],
                connected: ['LIVE', 'bg-emerald-50 text-emerald-700 border border-emerald-200'],
                local: ['LOCAL CACHE', 'bg-amber-50 text-amber-800 border border-amber-200'],
                error: ['DB ERROR', 'bg-red-50 text-red-700 border border-red-200'],
                offline: ['OFFLINE', 'bg-slate-100 text-slate-600 border border-slate-200']
            };
            const [label, color] = styles[state] || styles.offline;
            badge.textContent = label;
            badge.className = `${color} text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider`;
        }
        if (detailEl) detailEl.textContent = detail || '';
    }

    async function fetchAdminData() {
        let fData = [];
        let cData = [];
        let connectionState = 'offline';
        let connectionDetail = '';

        setDbConnectionBadge('syncing', 'Contacting Supabase...');

        try {
            const client = await getSupabaseClient();
            if (!client) {
                connectionState = 'offline';
                connectionDetail = 'Supabase client unavailable.';
            } else {
                let canQuery = false;
                const { data: authData } = await client.auth.getUser();
                const hasSession = !!authData?.user;

                if (hasSession) {
                    const adminAllowed = await isCurrentUserAdmin(client);
                    if (adminAllowed) {
                        canQuery = true;
                    } else {
                        connectionState = 'unauthorized';
                        connectionDetail = 'Signed in, but this account is not in admin_users.';
                    }
                } else if (localStorage.getItem('isLocalAdmin') === 'true' || localStorage.getItem('isLocalOfficeUser') === 'true') {
                    // Local / Office session active - try live database query directly
                    canQuery = true;
                }

                if (canQuery) {
                    const { data: feedbackRows, error: fErr } = await selectEvaluations(client);
                    const { data: complaintRows, error: cErr } = await client
                        .from('complaints')
                        .select('*')
                        .order('created_at', { ascending: false });

                    if (!fErr && !cErr) {
                        fData = feedbackRows || [];
                        cData = complaintRows || [];
                        connectionState = 'connected';
                        connectionDetail = `Loaded ${fData.length} feedback(s) and ${cData.length} complaint(s) from database.`;
                    } else {
                        console.warn('Database query with client failed, checking fallback:', fErr || cErr);
                        if (!hasSession) {
                            connectionState = 'local';
                            connectionDetail = 'Local cache mode — live cloud database query returned an error or required elevated auth.';
                        } else {
                            connectionState = 'error';
                            connectionDetail = (fErr || cErr)?.message || 'Database request failed.';
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to fetch from Supabase:', err);
            connectionState = 'error';
            connectionDetail = err.message || 'Database request failed.';
        }

        // Without a live DB session or in case of error, show only locally queued submissions
        if (connectionState !== 'connected') {
            const offlineFeedbacks = JSON.parse(localStorage.getItem('pendingFeedbacks')) || [];
            const offlineComplaints = JSON.parse(localStorage.getItem('pendingComplaints')) || [];
            fData = offlineFeedbacks;
            cData = offlineComplaints;
            const queued = offlineFeedbacks.length + offlineComplaints.length;
            connectionDetail += queued
                ? ` Showing ${queued} locally queued record(s).`
                : ' No local queued records.';
        }

        setDbConnectionBadge(
            connectionState === 'unauthorized' ? 'local' : connectionState,
            connectionDetail
        );

        // Sync Archived Vault data and filter out archived record IDs so dashboard total resets/excludes archived records
        await loadArchivedVault();
        const archivedFIds = new Set((archivedVault.feedbacks || []).map(f => f.id));
        const archivedCIds = new Set((archivedVault.complaints || []).map(c => c.id));
        
        fData = fData.filter(f => !archivedFIds.has(f.id));
        cData = cData.filter(c => !archivedCIds.has(c.id));

        lastFetchedFeedbacks = fData;
        lastFetchedComplaints = cData;

        // Ensure role UI is updated
        updateDashboardRoleUI();

        // Populate year filter based on fetched data dates
        populateYearFilter(fData, cData);

        // Apply filters and render elements
        applyFiltersAndRender();
    }

    function populateYearFilter(feedbacks, complaints) {
        const yearSelect = document.getElementById('filter-year-select');
        if (!yearSelect) return;
        
        const currentSelection = yearSelect.value || 'all';
        const years = new Set();
        
        // Ensure years start from 2026 all the way to 2036 (or current year + 10)
        const startYear = 2026;
        const endYear = Math.max(2036, new Date().getFullYear() + 10);
        for (let y = startYear; y <= endYear; y++) {
            years.add(y.toString());
        }
        
        feedbacks.forEach(row => {
            if (row.created_at) {
                const y = new Date(row.created_at).getFullYear();
                if (!isNaN(y)) years.add(y.toString());
            }
        });
        complaints.forEach(row => {
            if (row.created_at) {
                const y = new Date(row.created_at).getFullYear();
                if (!isNaN(y)) years.add(y.toString());
            }
        });
        
        const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
        
        yearSelect.innerHTML = '<option value="all">All Years</option>';
        sortedYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });
        
        if (sortedYears.includes(currentSelection)) {
            yearSelect.value = currentSelection;
        } else {
            yearSelect.value = 'all';
        }
    }

    function applyFiltersAndRender() {
        const dateInput = document.getElementById('filter-date-input');
        const monthSelect = document.getElementById('filter-month-select');
        const yearSelect = document.getElementById('filter-year-select');
        const timeSelect = document.getElementById('filter-time-select');
        
        const selectedDate = dateInput && dateInput.value ? dateInput.value.trim() : '';
        const selectedMonth = monthSelect ? monthSelect.value : 'all';
        const selectedYear = yearSelect ? yearSelect.value : 'all';
        const selectedTime = timeSelect ? timeSelect.value : 'all';
        
        // Base scope filtering: if logged in as an assigned office, restrict records to that office!
        let baseFeedbacks = lastFetchedFeedbacks;
        let baseComplaints = lastFetchedComplaints;

        if (currentUserRole === 'office' && currentOfficeScope) {
            const scopeNorm = currentOfficeScope.toLowerCase().trim();
            baseFeedbacks = baseFeedbacks.filter(row => (row.office_visited || '').toLowerCase().trim() === scopeNorm);
            baseComplaints = baseComplaints.filter(row => (row.place_of_incident || '').toLowerCase().trim() === scopeNorm);
        }

        lastFilteredFeedbacks = baseFeedbacks.filter(row => {
            if (!row.created_at) return true;
            const d = new Date(row.created_at);
            if (isNaN(d.getTime())) return true;
            
            const rYear = d.getFullYear().toString();
            const rMonth = String(d.getMonth() + 1).padStart(2, '0');
            const rDay = String(d.getDate()).padStart(2, '0');
            const rDateStr = `${rYear}-${rMonth}-${rDay}`;
            const rHour = d.getHours();
            
            if (selectedDate && rDateStr !== selectedDate) return false;
            if (selectedYear !== 'all' && rYear !== selectedYear) return false;
            if (selectedMonth !== 'all' && rMonth !== selectedMonth) return false;
            if (selectedTime === 'am' && rHour >= 12) return false;
            if (selectedTime === 'pm' && rHour < 12) return false;
            
            return true;
        });
        
        lastFilteredComplaints = baseComplaints.filter(row => {
            if (!row.created_at) return true;
            const d = new Date(row.created_at);
            if (isNaN(d.getTime())) return true;
            
            const rYear = d.getFullYear().toString();
            const rMonth = String(d.getMonth() + 1).padStart(2, '0');
            const rDay = String(d.getDate()).padStart(2, '0');
            const rDateStr = `${rYear}-${rMonth}-${rDay}`;
            const rHour = d.getHours();
            
            if (selectedDate && rDateStr !== selectedDate) return false;
            if (selectedYear !== 'all' && rYear !== selectedYear) return false;
            if (selectedMonth !== 'all' && rMonth !== selectedMonth) return false;
            if (selectedTime === 'am' && rHour >= 12) return false;
            if (selectedTime === 'pm' && rHour < 12) return false;
            
            return true;
        });
        
        const statTotalEl = document.getElementById('stat-total');
        if (statTotalEl) statTotalEl.textContent = lastFilteredFeedbacks.length;

        const statComplaintsEl = document.getElementById('stat-complaints');
        if (statComplaintsEl) statComplaintsEl.textContent = lastFilteredComplaints.length;

        const statAvgEl = document.getElementById('stat-avg');
        if (statAvgEl) {
            if (lastFilteredFeedbacks.length > 0) {
                const totalAvg = lastFilteredFeedbacks.reduce((sum, row) => sum + parseFloat(row.mean_score || 0), 0) / lastFilteredFeedbacks.length;
                statAvgEl.textContent = totalAvg.toFixed(2);
            } else {
                statAvgEl.textContent = '0.00';
            }
        }

        renderCCTable(lastFilteredFeedbacks);
        renderReportTable(lastFilteredFeedbacks);
        renderCommendationsTable(lastFilteredFeedbacks);

        const combinedLogs = [
            ...lastFilteredFeedbacks.map(row => ({ ...row, type: 'feedback' })),
            ...lastFilteredComplaints.map(row => ({
                id: row.id,
                created_at: row.created_at,
                office_visited: row.place_of_incident || 'N/A',
                client_type: 'Complainant',
                type: 'complaint',
                mean_score: null,
                service_availed: 'N/A',
                commendations: null,
                suggestions: row.details_of_complaint,
                complaint_payload: row
            }))
        ];
        renderLogTable(combinedLogs);
        renderComplaintsModalList(lastFilteredComplaints);
    }

    // --- Global Archive & Delete Handlers ---
    window.archiveSingleRecord = async function(id, type = 'feedback') {
        const isComplaint = type === 'complaint' || type === 'complaints';
        const itemType = isComplaint ? 'complaint' : 'feedback';
        
        const list = isComplaint ? (lastFetchedComplaints || []) : (lastFetchedFeedbacks || []);
        const item = list.find(r => r.id === id);

        const confirmRes = await Swal.fire({
            title: `Archive this ${itemType}?`,
            html: `This record will be moved into the <strong>Archived Vault</strong> and removed from live dashboard statistics.<br><br>You can search, export, or restore it anytime from the Vault.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-box-archive mr-1.5"></i> Archive to Vault',
            confirmButtonColor: '#22007c',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-2xl border-t-8 border-bisu-blue' }
        });

        if (!confirmRes.isConfirmed) return;

        try {
            Swal.fire({
                title: 'Archiving Record...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-2xl' }
            });

            const batchId = 'batch_' + Date.now();
            const nowIso = new Date().toISOString();
            const scopeLabel = `Single ${itemType === 'complaint' ? 'Complaint' : 'Feedback'} Archive (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;

            let taggedItem;
            if (item) {
                taggedItem = { ...item, archived_at: nowIso, batch_id: batchId, scope: scopeLabel };
            } else {
                taggedItem = { id: id, archived_at: nowIso, batch_id: batchId, scope: scopeLabel };
            }

            if (isComplaint) {
                archivedVault.complaints = [taggedItem, ...(archivedVault.complaints || [])];
            } else {
                archivedVault.feedbacks = [taggedItem, ...(archivedVault.feedbacks || [])];
            }

            const newBatch = {
                id: batchId,
                timestamp: nowIso,
                scope: scopeLabel,
                name: scopeLabel,
                feedbackCount: isComplaint ? 0 : 1,
                complaintCount: isComplaint ? 1 : 0,
                feedbacks: isComplaint ? [] : [taggedItem],
                complaints: isComplaint ? [taggedItem] : []
            };
            archivedVault.batches = [newBatch, ...(archivedVault.batches || [])];

            await saveArchivedVault();

            // Clear from live database table
            const client = await getSupabaseClient();
            if (client) {
                const table = isComplaint ? 'complaints' : 'feedbacks';
                await client.from(table).delete().eq('id', id);
            }

            await fetchAdminData();

            Swal.fire({
                title: 'Record Archived',
                html: `Moved to <strong>Archived Vault</strong>. Live dashboard metrics updated.`,
                icon: 'success',
                confirmButtonColor: '#22007c',
                customClass: { popup: 'rounded-2xl' }
            });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to archive record: ' + (err.message || err), 'error');
        }
    };

    window.deleteRecord = async function(id, type = 'feedbacks') {
        const isComplaint = type === 'complaint' || type === 'complaints';
        const itemType = isComplaint ? 'complaint' : 'feedback';

        const result = await Swal.fire({
            title: 'Delete or Archive?',
            html: `Do you want to <strong>Archive</strong> this ${itemType} to the Vault (zeros live stats while keeping data safe) or <strong>Permanently Delete</strong> it?`,
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#22007c',
            denyButtonColor: '#dc2626',
            confirmButtonText: '<i class="fa-solid fa-box-archive mr-1"></i> Move to Vault',
            denyButtonText: '<i class="fa-solid fa-trash mr-1"></i> Delete Permanently',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-xl' }
        });

        if (result.isConfirmed) {
            await window.archiveSingleRecord(id, type);
        } else if (result.isDenied) {
            try {
                const client = await getSupabaseClient();
                const table = isComplaint ? 'complaints' : 'feedbacks';
                const { error } = await client.from(table).delete().eq('id', id);
                if (error) throw error;
                showToast('Record permanently deleted.', 'success');
                fetchAdminData(); 
            } catch (err) {
                console.error(err);
                showToast('Failed to delete record.', 'error');
            }
        }
    };

    window.archiveOfficeData = async function(officeName) {
        const feedbacksToArchive = (lastFetchedFeedbacks || []).filter(f => f.office_visited === officeName);
        if (feedbacksToArchive.length === 0) {
            showToast(`No live records found for ${officeName}.`, 'info');
            return;
        }

        const confirmRes = await Swal.fire({
            title: `Archive data for ${officeName}?`,
            html: `This will move <strong>${feedbacksToArchive.length} feedback(s)</strong> for <strong>${escapeHtml(officeName)}</strong> into the Archived Vault and reset active dashboard metrics for this office to zero.<br><br>The records can be restored anytime from the Vault.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-box-archive mr-1"></i> Archive Office Data',
            confirmButtonColor: '#22007c',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-2xl border-t-8 border-bisu-blue' }
        });

        if (!confirmRes.isConfirmed) return;

        try {
            Swal.fire({
                title: 'Archiving Office Data...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-2xl' }
            });

            const batchId = 'batch_' + Date.now();
            const nowIso = new Date().toISOString();
            const scopeTitle = `Archive - ${officeName}`;

            const taggedFeedbacks = feedbacksToArchive.map(f => ({ ...f, archived_at: nowIso, batch_id: batchId, scope: scopeTitle }));

            archivedVault.feedbacks = [...taggedFeedbacks, ...(archivedVault.feedbacks || [])];

            const newBatch = {
                id: batchId,
                timestamp: nowIso,
                scope: scopeTitle,
                name: scopeTitle,
                feedbackCount: taggedFeedbacks.length,
                complaintCount: 0,
                feedbacks: taggedFeedbacks,
                complaints: []
            };
            archivedVault.batches = [newBatch, ...(archivedVault.batches || [])];

            await saveArchivedVault();

            const client = await getSupabaseClient();
            if (client) {
                await client.from('feedbacks').delete().eq('office_visited', officeName);
            }

            await fetchAdminData();

            Swal.fire({
                title: 'Office Data Archived',
                html: `Moved <strong>${taggedFeedbacks.length}</strong> record(s) for <strong>${escapeHtml(officeName)}</strong> to the Archived Vault. Live dashboard stats for this office are now zero.`,
                icon: 'success',
                confirmButtonColor: '#22007c',
                customClass: { popup: 'rounded-2xl' }
            });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to archive office data: ' + (err.message || err), 'error');
        }
    };

    window.deleteOfficeData = async function(officeName) {
        const result = await Swal.fire({
            title: `Clear ${officeName} data?`,
            html: `Do you want to <strong>Archive</strong> all data for ${escapeHtml(officeName)} to the Vault or <strong>Permanently Delete</strong> it?`,
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#22007c',
            denyButtonColor: '#dc2626',
            confirmButtonText: '<i class="fa-solid fa-box-archive mr-1"></i> Archive to Vault',
            denyButtonText: '<i class="fa-solid fa-trash mr-1"></i> Delete Permanently',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-xl border-t-8 border-red-500' }
        });

        if (result.isConfirmed) {
            await window.archiveOfficeData(officeName);
        } else if (result.isDenied) {
            try {
                const client = await getSupabaseClient();
                const { error } = await client.from('feedbacks').delete().eq('office_visited', officeName);
                if (error) throw error;
                showToast(`Cleared all data for ${officeName}.`, 'success');
                fetchAdminData();
            } catch (err) {
                console.error(err);
                showToast('Failed to clear office data.', 'error');
            }
        }
    };

    function renderCCTable(data) {
        const tbody = document.getElementById('cc-table-body');
        const tfoot = document.getElementById('cc-table-foot');
        tbody.innerHTML = '';
        tfoot.innerHTML = '';
        
        const grouped = {};
        let totals = { cust: 0, m: 0, f: 0, cit: 0, bus: 0, gov: 0 };
        let ccTotals = new Array(13).fill(0);

        data.forEach(row => {
            if(!grouped[row.office_visited]) {
                grouped[row.office_visited] = { cust: 0, m:0, f:0, cit:0, bus:0, gov:0, cc: new Array(13).fill(0) };
            }
            let g = grouped[row.office_visited];
            g.cust++; totals.cust++;
            
            if(row.sex === 'Male') { g.m++; totals.m++; }
            if(row.sex === 'Female') { g.f++; totals.f++; }
            
            if(row.client_type === 'Citizen') { g.cit++; totals.cit++; }
            if(row.client_type === 'Business') { g.bus++; totals.bus++; }
            if(row.client_type === 'Government') { g.gov++; totals.gov++; }

            if(row.cc1 >= 1 && row.cc1 <= 4) {
                const idx = row.cc1 - 1;
                g.cc[idx]++;
                ccTotals[idx]++;
            }
            if(row.cc2 >= 1 && row.cc2 <= 5) {
                const idx = 4 + (row.cc2 - 1);
                g.cc[idx]++;
                ccTotals[idx]++;
            }
            if(row.cc3 >= 1 && row.cc3 <= 4) {
                const idx = 9 + (row.cc3 - 1);
                g.cc[idx]++;
                ccTotals[idx]++;
            }
        });

        for(let office in grouped) {
            let g = grouped[office];
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-slate-50';
            let ccTds = g.cc.map(v => `<td class="px-1 py-3 border">${v}</td>`).join('');
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-900 border text-left col-office">${office}</td>
                <td class="px-4 py-3 border font-bold text-bisu-blue">${g.cust}</td>
                <td class="px-2 py-3 border">${g.m}</td>
                <td class="px-2 py-3 border">${g.f}</td>
                <td class="px-2 py-3 border">${g.cit}</td>
                <td class="px-2 py-3 border">${g.bus}</td>
                <td class="px-2 py-3 border">${g.gov}</td>
                ${ccTds}
            `;
            tbody.appendChild(tr);
        }

        if(Object.keys(grouped).length === 0) {
            tbody.innerHTML = `<tr><td colspan="19" class="p-0 border"><div class="sticky left-0 px-6 py-8 text-slate-500 bg-white">No data found yet.</div></td></tr>`;
        } else {
            let ccFoot = ccTotals.map(v => `<td class="px-1 py-3 border">${v}</td>`).join('');
            tfoot.innerHTML = `
                <tr>
                    <td class="px-4 py-3 border text-right">Overall Rating</td>
                    <td class="px-4 py-3 border font-bold text-bisu-blue">${totals.cust}</td>
                    <td class="px-2 py-3 border">${totals.m}</td>
                    <td class="px-2 py-3 border">${totals.f}</td>
                    <td class="px-2 py-3 border">${totals.cit}</td>
                    <td class="px-2 py-3 border">${totals.bus}</td>
                    <td class="px-2 py-3 border">${totals.gov}</td>
                    ${ccFoot}
                </tr>
            `;
        }
    }

    function renderReportTable(data) {
        const thead = document.getElementById('report-table-head');
        const tbody = document.getElementById('report-table-body');
        let tfoot = document.getElementById('report-table-foot');
        if (!tfoot) {
            tfoot = document.createElement('tfoot');
            tfoot.id = 'report-table-foot';
            tfoot.className = 'font-bold bg-slate-50';
            tbody.parentNode.appendChild(tfoot);
        }
        
        tbody.innerHTML = '';
        tfoot.innerHTML = '';

        const activeDimensions = formConfig.dimensions['en'];
        
        // Dynamically build the table header for active dimensions
        if(thead) {
            thead.innerHTML = `
                <tr>
                    <th scope="col" class="px-4 py-3 border">Offices</th>
                    <th scope="col" class="px-4 py-3 border text-center">Number of<br>Customers (f)</th>
                    ${activeDimensions.map(d => {
                        // Extract label text after numbers if exists (e.g., "1. Responsiveness" -> "Responsiveness")
                        let labelText = d.label;
                        if(labelText.includes('.')) {
                            labelText = labelText.split('.').slice(1).join('.').trim();
                        }
                        // Handle "Reliability (Quality)" specifically to match physical form line breaks
                        if(labelText === 'Reliability (Quality)') labelText = 'Reliability<br>(Quality)';
                        if(labelText === 'Access & Facilities') labelText = 'Access &<br>Facilities';
                        
                        return `<th scope="col" class="px-4 py-3 border text-center" title="${d.label}">${labelText}</th>`;
                    }).join('')}
                    <th scope="col" class="px-3 py-3 border text-center bg-blue-50">Mean<br>Satisfaction</th>
                    <th scope="col" class="px-4 py-3 border text-center">Description</th>
                </tr>
            `;
        }

        // Group by office
        const grouped = {};
        let totals = { cust: 0, meanScore: 0, dims: {} };
        activeDimensions.forEach(d => totals.dims[d.id] = 0);

        data.forEach(row => {
            if(!grouped[row.office_visited]) {
                grouped[row.office_visited] = { count: 0, meanScore:0, dims: {} };
                activeDimensions.forEach(d => grouped[row.office_visited].dims[d.id] = 0);
            }
            let g = grouped[row.office_visited];
            g.count++;
            totals.cust++;
            g.meanScore += parseFloat(row.mean_score || 0);
            totals.meanScore += parseFloat(row.mean_score || 0);
            
            const rowRatings = row.ratings || row;
            activeDimensions.forEach(d => {
                g.dims[d.id] += parseInt(rowRatings[d.id] || 0);
                totals.dims[d.id] += parseInt(rowRatings[d.id] || 0);
            });
        });

        // Function to determine description
        const getDesc = (score) => {
            if(score >= 4.5) return 'Outstanding';
            if(score >= 3.5) return 'Very Satisfactory';
            if(score >= 2.5) return 'Satisfactory';
            if(score >= 1.5) return 'Fair';
            return 'Poor';
        };

        for(let office in grouped) {
            let g = grouped[office];
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b hover:bg-slate-50';
            
            let dimsCols = activeDimensions.map(d => {
                let average = g.count > 0 ? (g.dims[d.id]/g.count).toFixed(2) : "0.00";
                return `<td class="px-4 py-3 text-center border font-medium">${average}</td>`;
            }).join('');

            let rowAvg = g.count > 0 ? (g.meanScore/g.count).toFixed(2) : "0.00";

            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-900 border text-left col-office">${office}</td>
                <td class="px-4 py-3 text-center border font-bold text-bisu-blue">${g.count}</td>
                ${dimsCols}
                <td class="px-4 py-3 text-center border bg-blue-50 font-bold">${rowAvg}</td>
                <td class="px-4 py-3 text-center border text-xs font-semibold uppercase">${getDesc(rowAvg)}</td>
            `;
            tbody.appendChild(tr);
        }

        if(Object.keys(grouped).length === 0) {
            tbody.innerHTML = `<tr><td colspan="${activeDimensions.length + 4}" class="p-0 border"><div class="sticky left-0 px-6 py-8 text-slate-500 bg-white">No data found yet.</div></td></tr>`;
        } else {
            let dimsFootCols = activeDimensions.map(d => {
                let average = totals.cust > 0 ? (totals.dims[d.id]/totals.cust).toFixed(2) : "0.00";
                return `<td class="px-4 py-3 border">${average}</td>`;
            }).join('');
            let totalAvg = totals.cust > 0 ? (totals.meanScore/totals.cust).toFixed(2) : "0.00";
            
            tfoot.innerHTML = `
                <tr>
                    <td class="px-4 py-3 border text-left font-bold">Overall Rating</td>
                    <td class="px-4 py-3 border font-bold text-center text-bisu-blue">${totals.cust}</td>
                    ${dimsFootCols}
                    <td class="px-4 py-3 border bg-blue-50 text-center font-bold">${totalAvg}</td>
                    <td class="px-4 py-3 border text-xs font-semibold uppercase">${getDesc(totalAvg)}</td>
                </tr>
            `;
        }
    }

    function renderCommendationsTable(data) {
        const tbody = document.getElementById('commendations-table-body');
        tbody.innerHTML = '';
        
        let hasData = false;

        data.forEach(row => {
            const hasCommendation = row.commendations && row.commendations.trim() !== '';
            const hasSuggestion = row.suggestions && row.suggestions.trim() !== '';
            
            if (hasCommendation || hasSuggestion) {
                hasData = true;
                const tr = document.createElement('tr');
                tr.className = 'bg-white border-b hover:bg-slate-50 text-sm';
                
                tr.innerHTML = `
                    <td class="px-4 py-3 font-medium text-slate-900 border text-left align-top col-office">${row.office_visited}</td>
                    <td class="px-4 py-3 border text-left align-top max-w-[250px] whitespace-pre-wrap">${hasCommendation ? row.commendations : '<span class="text-slate-400 italic">None</span>'}</td>
                    <td class="px-4 py-3 border text-left align-top max-w-[250px] whitespace-pre-wrap">${hasSuggestion ? row.suggestions : '<span class="text-slate-400 italic">None</span>'}</td>
                    <td class="px-4 py-3 border align-top"></td>
                    <td class="px-4 py-3 border align-top"></td>
                    <td class="px-4 py-3 border align-top"></td>
                    <td class="px-4 py-3 border align-top bg-slate-50"></td>
                    <td class="px-4 py-3 border align-top bg-slate-50"></td>
                    <td class="px-4 py-3 border align-top bg-slate-50"></td>
                `;
                tbody.appendChild(tr);
            }
        });

        if (!hasData) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-0 border"><div class="sticky left-0 px-6 py-8 text-slate-500 bg-white">No commendations or suggestions found.</div></td></tr>';
        }
    }

    function renderLogTable(data) {
        const logTbody = document.getElementById('log-table-body');
        if (!logTbody) return;
        logTbody.innerHTML = '';
        
        // Ensure clean header with Actions column
        const logThead = document.querySelector('#section-log table thead tr') || document.querySelector('#view-admin table:nth-of-type(2) thead tr');
        if (logThead) {
            logThead.innerHTML = `
                <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Timestamp</th>
                <th scope="col" class="px-4 py-3.5 whitespace-nowrap">Office Visited</th>
                <th scope="col" class="px-4 py-3.5 text-center whitespace-nowrap">Client Type</th>
                <th scope="col" class="px-4 py-3.5 text-center whitespace-nowrap">Feedback Type</th>
                <th scope="col" class="px-4 py-3.5 text-center whitespace-nowrap">Rating Score</th>
                <th scope="col" class="px-4 py-3.5 text-center whitespace-nowrap">Action</th>
            `;
        }

        const recentData = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
        
        recentData.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b border-slate-100 hover:bg-slate-50 transition';
            const isComplaint = row.type === 'complaint';
            const badgeClass = isComplaint ? 'bg-red-100 text-red-800 border-red-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
            const dateDisplay = row.created_at ? new Date(row.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
            
            tr.innerHTML = `
                <td class="px-4 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">${dateDisplay}</td>
                <td class="px-4 py-3.5 font-bold text-slate-800">${escapeHtml(row.office_visited || 'General Office')}</td>
                <td class="px-4 py-3.5 text-center text-slate-600 font-medium">${escapeHtml(row.client_type || 'N/A')}</td>
                <td class="px-4 py-3.5 text-center"><span class="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${badgeClass}">${row.type || 'Feedback'}</span></td>
                <td class="px-4 py-3.5 text-center font-extrabold font-mono text-slate-800">${row.mean_score ? parseFloat(row.mean_score).toFixed(2) : 'N/A'}</td>
                <td class="px-4 py-3.5 text-center whitespace-nowrap">
                    <button type="button" onclick="archiveSingleRecord('${row.id}', '${row.type || 'feedback'}')" title="Archive Record to Vault" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs">
                        <i class="fa-solid fa-box-archive text-[11px]"></i> Archive
                    </button>
                </td>
            `;
            logTbody.appendChild(tr);
        });

        if (recentData.length === 0) {
            logTbody.innerHTML = '<tr><td colspan="6" class="p-0"><div class="sticky left-0 px-6 py-8 text-slate-400 bg-white text-center font-medium">No recent submissions recorded.</div></td></tr>';
        }
    }

    let currentModalComplaintsData = [];

    function initComplaintsListDelegation() {
        const container = document.getElementById('complaints-list-container');
        if (!container || container._hasDelegatedListener) return;
        container._hasDelegatedListener = true;

        container.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.action-copy-complaint-btn');
            if (copyBtn) {
                const id = copyBtn.getAttribute('data-id');
                const target = (currentModalComplaintsData || []).find(item => String(item.id) === String(id));
                if (!target) return;
                const summaryText = `[BISU FORMAL COMPLAINT RECORD]\nDate Filed: ${new Date(target.created_at).toLocaleString()}\nComplainant: ${target.name || 'Anonymous'}\nContact: ${target.contact_details || 'N/A'}\nIncident Date: ${target.date_of_incident || 'N/A'}\nIncident Place: ${target.place_of_incident || 'N/A'}\nAct Complained Of: ${target.details_of_complaint || 'N/A'}\nNarrative Report: ${target.narrative_report || 'N/A'}\nDesired Outcome: ${target.desired_outcome || 'N/A'}`;
                
                navigator.clipboard.writeText(summaryText).then(() => {
                    showToast('Complaint record copied to clipboard!', 'success');
                }).catch(() => {
                    showToast('Failed to copy.', 'error');
                });
                return;
            }

            const printBtn = e.target.closest('.action-print-complaint-btn');
            if (printBtn) {
                const id = printBtn.getAttribute('data-id');
                const target = (currentModalComplaintsData || []).find(item => String(item.id) === String(id));
                if (target) {
                    printOfficialComplaintForm(target);
                }
                return;
            }
        });
    }

    function renderComplaintsModalList(cData, forceRender = false) {
        if (cData) {
            currentModalComplaintsData = cData;
        }
        const modal = document.getElementById('admin-complaints-modal');
        if (!forceRender && modal && modal.classList.contains('hidden')) {
            return; // Skip costly DOM generation if modal is closed
        }

        const container = document.getElementById('complaints-list-container');
        const badgeEl = document.getElementById('complaints-count-badge');
        const searchInput = document.getElementById('complaints-search-input');
        if (!container) return;

        initComplaintsListDelegation();

        const list = currentModalComplaintsData || [];
        const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();

        const filtered = list.filter(c => {
            if (!searchTerm) return true;
            return (c.name || '').toLowerCase().includes(searchTerm) ||
                   (c.place_of_incident || '').toLowerCase().includes(searchTerm) ||
                   (c.details_of_complaint || '').toLowerCase().includes(searchTerm) ||
                   (c.narrative_report || '').toLowerCase().includes(searchTerm) ||
                   (c.desired_outcome || '').toLowerCase().includes(searchTerm) ||
                   (c.contact_details || '').toLowerCase().includes(searchTerm);
        });

        if (badgeEl) {
            badgeEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'Complaint' : 'Complaints'}`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div class="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mb-3 border border-slate-200">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h4 class="text-slate-700 font-bold text-base mb-1">No Filed Complaints ${searchTerm ? 'Found' : 'Available'}</h4>
                    <p class="text-xs text-slate-500 max-w-sm">
                        ${searchTerm ? 'No complaints matched your search filter. Try adjusting your search query.' : 'There are currently no formal client complaints registered in the database.'}
                    </p>
                </div>
            `;
            return;
        }

        const cardsHtml = filtered.map(c => {
            const dateStr = new Date(c.created_at).toLocaleString();
            const isAnon = !c.name || c.name.trim().toLowerCase() === 'anonymous' || c.name.trim() === '';
            const complainantLabel = isAnon ? 'Anonymous Complainant' : escapeHtml(c.name);

            return `
                <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 relative">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
                        <div class="flex items-center space-x-3">
                            <div class="w-9 h-9 rounded-xl ${isAnon ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-600'} border border-slate-200/80 flex items-center justify-center font-bold text-xs shrink-0">
                                <i class="fa-solid ${isAnon ? 'fa-user-secret' : 'fa-user'}"></i>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h4 class="font-bold text-slate-800 text-sm leading-snug">${complainantLabel}</h4>
                                    ${isAnon ? '<span class="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200">Anonymous</span>' : ''}
                                </div>
                                <p class="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-0.5">
                                    <i class="fa-regular fa-clock text-slate-400 text-[10px]"></i>
                                    <span>Submitted ${dateStr}</span>
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 self-end sm:self-center">
                            <span class="bg-red-50 text-red-700 border border-red-200/80 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span> Urgent Action
                            </span>
                            <div class="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl p-1">
                                <button type="button" class="action-copy-complaint-btn p-1.5 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-white cursor-pointer" data-id="${c.id}" title="Copy Summary Text">
                                    <i class="fa-solid fa-copy text-xs"></i>
                                </button>
                                <button type="button" class="action-print-complaint-btn p-1.5 text-slate-500 hover:text-bisu-blue transition-colors rounded-lg hover:bg-white cursor-pointer" data-id="${c.id}" title="Print Official Record">
                                    <i class="fa-solid fa-print text-xs"></i>
                                </button>
                                <button type="button" onclick="archiveSingleRecord('${c.id}', 'complaint')" class="p-1.5 text-amber-600 hover:text-amber-800 transition-colors rounded-lg hover:bg-white cursor-pointer" title="Archive Complaint to Vault">
                                    <i class="fa-solid fa-box-archive text-xs"></i>
                                </button>
                                <button type="button" onclick="deleteRecord('${c.id}', 'complaint')" class="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-white cursor-pointer" title="Delete Complaint">
                                    <i class="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Subject / Act Complained Of Callout -->
                    <div class="bg-red-50/50 border border-red-200/80 rounded-xl p-3 sm:p-3.5">
                        <div class="text-[10px] uppercase font-bold text-red-700 tracking-wider mb-1 flex items-center gap-1.5">
                            <i class="fa-solid fa-circle-exclamation text-[11px] text-red-600"></i>
                            <span>Act / Subject Complained Of</span>
                        </div>
                        <p class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">${escapeHtml(c.details_of_complaint || 'No specific subject provided.')}</p>
                    </div>

                    <!-- Metadata Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <div>
                            <span class="text-slate-400 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Complainant</span>
                            <span class="font-semibold text-slate-800 flex items-center gap-1.5 truncate text-xs">
                                <i class="fa-solid fa-user text-slate-400 text-[10px]"></i> ${escapeHtml(c.name || 'Anonymous')}
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Contact Details</span>
                            <span class="font-semibold text-slate-800 flex items-center gap-1.5 truncate text-xs">
                                <i class="fa-solid fa-phone text-slate-400 text-[10px]"></i> ${escapeHtml(c.contact_details || 'Not provided')}
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Incident Date</span>
                            <span class="font-semibold text-slate-800 flex items-center gap-1.5 truncate text-xs">
                                <i class="fa-solid fa-calendar text-slate-400 text-[10px]"></i> ${escapeHtml(c.date_of_incident || 'Unspecified')}
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 font-semibold block uppercase tracking-wider text-[9px] mb-0.5">Incident Place</span>
                            <span class="font-semibold text-slate-800 flex items-center gap-1.5 truncate text-xs">
                                <i class="fa-solid fa-location-dot text-slate-400 text-[10px]"></i> ${escapeHtml(c.place_of_incident || 'Unspecified')}
                            </span>
                        </div>
                    </div>

                    <!-- Narrative Report -->
                    <div class="space-y-1">
                        <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-align-left text-slate-400 text-[10px]"></i> Detailed Narrative Report
                        </span>
                        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                            ${escapeHtml(c.narrative_report || 'No narrative provided.')}
                        </div>
                    </div>

                    <!-- Desired Outcome -->
                    <div class="space-y-1">
                        <span class="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-bullseye text-rose-600 text-[10px]"></i> Expected Resolution / Desired Outcome
                        </span>
                        <div class="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 text-xs sm:text-sm text-rose-950 font-normal leading-relaxed whitespace-pre-wrap">
                            ${escapeHtml(c.desired_outcome || 'No specific outcome requested.')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;
    }

    // === Export Functions ===
    function triggerDownload(dataUri, fileName) {
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = fileName;
        document.body.appendChild(a);
        setTimeout(() => {
            a.click();
            document.body.removeChild(a);
        }, 150);
    }

    async function exportToPDF() {
        const feedbacks = (typeof lastFilteredFeedbacks !== 'undefined' && lastFilteredFeedbacks) ? lastFilteredFeedbacks : [];
        const complaints = (typeof lastFilteredComplaints !== 'undefined' && lastFilteredComplaints) ? lastFilteredComplaints : [];
        if (feedbacks.length === 0 && complaints.length === 0) {
            showToast('No filtered data available to export.', 'error');
            return;
        }

        const isOffice = currentUserRole === 'office' && !!currentOfficeScope;
        const reportTitle = isOffice 
            ? `${currentOfficeScope.toUpperCase()} MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT`
            : 'MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT';
        const filePrefix = isOffice 
            ? `BISU_${currentOfficeScope.replace(/[^a-zA-Z0-9]/g, '_')}_Summary_Report`
            : 'BISU_Summary_Report';

        await generatePDFForDataset(feedbacks, complaints, reportTitle, filePrefix);
    }

    // Export helper
    function getDesc(score) {
        if(score >= 4.5) return 'Outstanding';
        if(score >= 3.5) return 'Very Satisfactory';
        if(score >= 2.5) return 'Satisfactory';
        if(score >= 1.5) return 'Fair';
        return 'Poor';
    }

    // --- Professional Excel Spreadsheet Formatting Engine ---
    function buildExecutiveSummarySheet(feedbacks, complaints, reportTitle) {
        const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

        let totalScore = 0;
        let validScoreCount = 0;
        const officeCounts = {};

        feedbacks.forEach(f => {
            const score = parseFloat(f.mean_score);
            if (!isNaN(score) && score > 0) {
                totalScore += score;
                validScoreCount++;
            }
            const off = f.office_visited || 'Unspecified Office';
            officeCounts[off] = (officeCounts[off] || 0) + 1;
        });

        const overallAvg = validScoreCount > 0 ? (totalScore / validScoreCount) : 0;
        const overallRatingText = overallAvg > 0 ? `${overallAvg.toFixed(2)} / 5.00 (${getDesc(overallAvg)})` : 'N/A';

        let topOfficeName = 'None';
        let topOfficeCount = 0;
        Object.entries(officeCounts).forEach(([off, count]) => {
            if (count > topOfficeCount) {
                topOfficeCount = count;
                topOfficeName = off;
            }
        });
        const totalF = feedbacks.length || 0;
        const topOfficeDetail = topOfficeCount > 0 
            ? `${topOfficeName} (${topOfficeCount} records, ${((topOfficeCount / (totalF || 1)) * 100).toFixed(1)}%)`
            : 'N/A';

        // Construct 3-column structured dataset
        const aoa = [
            ["BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS", "", ""], // Row 0 (A1:C1)
            ["EXECUTIVE SUMMARY & PERFORMANCE REPORT", "", ""],        // Row 1 (A2:C2)
            [`Report Scope: ${reportTitle} | Generated: ${nowStr}`, "", ""], // Row 2 (A3:C3)
            ["", "", ""],                                             // Row 3 (A4:C4) - blank spacing
            ["KEY PERFORMANCE INDICATORS (KPIs)", "", ""],           // Row 4 (A5:C5)
            ["Metric / Category", "Summary Value", "Qualitative Assessment / Details"], // Row 5 (A6:C6)
            ["Total Client Feedback Records", feedbacks.length, feedbacks.length > 0 ? "Total Client Evaluations Received" : "No Records"],
            ["Overall Mean Satisfaction Rating", overallAvg > 0 ? Number(overallAvg.toFixed(2)) : "N/A", overallRatingText],
            ["Total Formal Complaints Filed", complaints.length, complaints.length === 0 ? "Zero Complaints (Clean Record)" : "Formal Complaints Logged"],
            ["Top Visited Office / Unit", topOfficeCount > 0 ? topOfficeName : "N/A", topOfficeDetail],
            ["", "", ""],                                             // Row 10 - blank spacing
            ["OFFICE & SERVICE UNIT FEEDBACK DISTRIBUTION", "", ""],  // Row 11 (A12:C12)
            ["Office / Unit Visited", "Feedback Count", "Percentage Share"] // Row 12 (A13:C13)
        ];

        const sortedOffices = Object.entries(officeCounts).sort((a, b) => b[1] - a[1]);
        const officeStartRow = aoa.length;
        if (sortedOffices.length === 0) {
            aoa.push(["No office feedback data recorded", 0, "0.0%"]);
        } else {
            sortedOffices.forEach(([off, count]) => {
                const pct = ((count / (totalF || 1)) * 100).toFixed(1) + '%';
                aoa.push([off, count, pct]);
            });
            // Total Summary Row
            aoa.push(["TOTAL FEEDBACK VOLUME", totalF, "100.0%"]);
        }

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Header Merges
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // A1:C1
            { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // A2:C2
            { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // A3:C3
            { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // A5:C5 (KPI Section Header)
            { s: { r: 11, c: 0 }, e: { r: 11, c: 2 } } // A12:C12 (Office Section Header)
        ];

        // Column Widths
        ws['!cols'] = [
            { wch: 38 }, // Column A
            { wch: 22 }, // Column B
            { wch: 36 }  // Column C
        ];

        // Row Heights
        const rowHeights = [
            { hpt: 28 }, // 0: Main Title
            { hpt: 22 }, // 1: Subtitle
            { hpt: 18 }, // 2: Metadata
            { hpt: 10 }, // 3: Spacer
            { hpt: 24 }, // 4: KPI Header
            { hpt: 22 }, // 5: KPI Col Headers
            { hpt: 20 }, // 6: KPI 1
            { hpt: 20 }, // 7: KPI 2
            { hpt: 20 }, // 8: KPI 3
            { hpt: 20 }, // 9: KPI 4
            { hpt: 10 }, // 10: Spacer
            { hpt: 24 }, // 11: Office Header
            { hpt: 22 }  // 12: Office Col Headers
        ];
        for (let i = officeStartRow; i < aoa.length; i++) {
            rowHeights.push({ hpt: 20 });
        }
        ws['!rows'] = rowHeights;

        // Apply Styles
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                const cell = ws[cellRef];

                if (R === 0) {
                    // Header Banner Title (BISU Deep Royal Navy Blue)
                    cell.s = {
                        fill: { fgColor: { rgb: "180058" } },
                        font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 1) {
                    // Sheet Subtitle (BISU Navy with Gold text)
                    cell.s = {
                        fill: { fgColor: { rgb: "22007C" } },
                        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFD500" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 2) {
                    // Scope / Metadata (Soft Slate Fill)
                    cell.s = {
                        fill: { fgColor: { rgb: "F1F5F9" } },
                        font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "475569" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 4 || R === 11) {
                    // Section Banners (Deep Indigo + Gold Accent)
                    cell.s = {
                        fill: { fgColor: { rgb: "1E1B4B" } },
                        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFD500" } },
                        alignment: { horizontal: "left", vertical: "center", indent: 1 },
                        border: {
                            top: { style: "medium", color: { rgb: "22007C" } },
                            bottom: { style: "medium", color: { rgb: "FFD500" } }
                        }
                    };
                } else if (R === 5 || R === 12) {
                    // Table Column Headers (Royal Navy)
                    cell.s = {
                        fill: { fgColor: { rgb: "22007C" } },
                        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
                        alignment: { horizontal: C === 0 ? "left" : "center", vertical: "center" },
                        border: {
                            top: { style: "thin", color: { rgb: "180058" } },
                            bottom: { style: "medium", color: { rgb: "FFD500" } },
                            left: { style: "thin", color: { rgb: "334155" } },
                            right: { style: "thin", color: { rgb: "334155" } }
                        }
                    };
                } else if ((R >= 6 && R <= 9) || (R >= 13 && R < aoa.length - 1)) {
                    // Data Rows (Alternating Zebra Striping)
                    const isEven = (R % 2 === 0);
                    cell.s = {
                        fill: { fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" } },
                        font: { name: "Calibri", sz: 10, color: { rgb: "1E293B" }, bold: (R >= 6 && R <= 9 && C === 0) },
                        alignment: { 
                            horizontal: C === 0 ? "left" : (C === 1 ? "center" : (R >= 6 && R <= 9 ? "left" : "center")), 
                            vertical: "center" 
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        }
                    };
                } else if (R === aoa.length - 1 && sortedOffices.length > 0) {
                    // Total Summary Row at bottom
                    cell.s = {
                        fill: { fgColor: { rgb: "E2E8F0" } },
                        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
                        alignment: { horizontal: C === 0 ? "left" : "center", vertical: "center" },
                        border: {
                            top: { style: "thin", color: { rgb: "94A3B8" } },
                            bottom: { style: "double", color: { rgb: "1E293B" } },
                            left: { style: "thin", color: { rgb: "CBD5E1" } },
                            right: { style: "thin", color: { rgb: "CBD5E1" } }
                        }
                    };
                }
            }
        }

        return ws;
    }

    function buildFormattedExcelSheet(dataArray, sheetTitle, subtitleInfo) {
        if (!dataArray || dataArray.length === 0) {
            const wsEmpty = XLSX.utils.aoa_to_sheet([
                ["BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS"],
                [sheetTitle.toUpperCase()],
                [subtitleInfo],
                [],
                ["No records available for this report criteria."]
            ]);
            wsEmpty['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }
            ];
            wsEmpty['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
            return wsEmpty;
        }

        const headers = Object.keys(dataArray[0]);
        const numCols = headers.length;

        // Header Banner Rows
        const aoaHeaders = [
            [ "BOHOL ISLAND STATE UNIVERSITY - CALAPE CAMPUS" ],
            [ sheetTitle.toUpperCase() ],
            [ subtitleInfo ],
            [] // Blank spacer
        ];

        // Pad banner rows to match column count
        aoaHeaders.forEach(row => {
            while (row.length < numCols) row.push("");
        });

        const ws = XLSX.utils.aoa_to_sheet(aoaHeaders);

        // Append JSON records starting at row 5 (index 4)
        XLSX.utils.sheet_add_json(ws, dataArray, { origin: "A5" });

        // Merges for full width banner
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } }
        ];

        // Smart column width calculation
        const colWidths = headers.map(key => {
            let maxLen = key.length;
            dataArray.forEach(row => {
                const valStr = String(row[key] ?? '');
                if (valStr.includes('\n')) {
                    valStr.split('\n').forEach(l => {
                        if (l.length > maxLen) maxLen = l.length;
                    });
                } else if (valStr.length > maxLen) {
                    maxLen = valStr.length;
                }
            });

            if (/Commendations|Suggestions|Narrative|Act Complained Of|Expected Resolution/i.test(key)) {
                return { wch: Math.min(Math.max(maxLen + 4, 25), 45) };
            }
            if (/Timestamp|Date/i.test(key)) {
                return { wch: Math.max(maxLen + 4, 20) };
            }
            return { wch: Math.min(Math.max(maxLen + 4, 13), 36) };
        });
        ws['!cols'] = colWidths;

        // Row Heights
        const rowHeights = [
            { hpt: 28 }, // 0: Main Title
            { hpt: 22 }, // 1: Subtitle
            { hpt: 18 }, // 2: Metadata
            { hpt: 10 }, // 3: Spacer
            { hpt: 26 }  // 4: Table Column Headers
        ];
        dataArray.forEach(() => {
            rowHeights.push({ hpt: 22 });
        });
        ws['!rows'] = rowHeights;

        // AutoFilter on Table Header (Row 5 / index 4)
        const startRow = 4;
        const endRow = startRow + dataArray.length;
        ws['!autofilter'] = {
            ref: XLSX.utils.encode_range({
                s: { r: startRow, c: 0 },
                e: { r: endRow, c: numCols - 1 }
            })
        };

        // Apply formatting & cell styles
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
                const cell = ws[cellRef];
                const headerKey = headers[C] || '';

                if (R === 0) {
                    // Header Banner Title (BISU Deep Royal Navy Blue)
                    cell.s = {
                        fill: { fgColor: { rgb: "180058" } },
                        font: { name: "Calibri", sz: 13, bold: true, color: { rgb: "FFFFFF" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 1) {
                    // Subtitle (BISU Navy with Gold text)
                    cell.s = {
                        fill: { fgColor: { rgb: "22007C" } },
                        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFD500" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 2) {
                    // Scope / Metadata (Soft Slate)
                    cell.s = {
                        fill: { fgColor: { rgb: "F1F5F9" } },
                        font: { name: "Calibri", sz: 9.5, italic: true, color: { rgb: "475569" } },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                } else if (R === 4) {
                    // Table Column Headers (Deep Royal Navy + Gold Bottom Border)
                    cell.s = {
                        fill: { fgColor: { rgb: "180058" } },
                        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
                        alignment: { horizontal: "center", vertical: "center", wrapText: true },
                        border: {
                            top: { style: "thin", color: { rgb: "180058" } },
                            bottom: { style: "medium", color: { rgb: "FFD500" } },
                            left: { style: "thin", color: { rgb: "334155" } },
                            right: { style: "thin", color: { rgb: "334155" } }
                        }
                    };
                } else if (R > 4) {
                    // Table Data Rows (Alternating Zebra Rows)
                    const isEven = (R % 2 === 0);
                    const isCenteredCol = /Timestamp|Date|Mean Rating Score|Rating Assessment|CC1|CC2|CC3|Sex|Category|Feedback Category/i.test(headerKey);
                    const isLongTextCol = /Commendations|Suggestions|Narrative|Act Complained Of|Expected Resolution/i.test(headerKey);

                    cell.s = {
                        fill: { fgColor: { rgb: isEven ? "F8FAFC" : "FFFFFF" } },
                        font: { name: "Calibri", sz: 9.5, color: { rgb: "1E293B" } },
                        alignment: { 
                            horizontal: isCenteredCol ? "center" : "left", 
                            vertical: "center",
                            wrapText: isLongTextCol
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        }
                    };

                    if (/Rating Assessment/i.test(headerKey)) {
                        const txt = String(cell.v || '');
                        if (txt === 'Outstanding' || txt === 'Very Satisfactory') {
                            cell.s.font = { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "0E811B" } };
                        } else if (txt === 'Poor' || txt === 'Fair') {
                            cell.s.font = { name: "Calibri", sz: 9.5, bold: true, color: { rgb: "DC2626" } };
                        }
                    }
                }
            }
        }

        return ws;
    }

    function exportToExcel() {
        const feedbacks = lastFilteredFeedbacks || [];
        const complaints = lastFilteredComplaints || [];

        if (feedbacks.length === 0 && complaints.length === 0) {
            showToast('No filtered data available to export.', 'error');
            return;
        }

        Swal.fire({
            title: 'Generating Spreadsheet',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            customClass: { popup: 'rounded-3xl shadow-xl border-t-4 border-emerald-600' }
        });

        try {
            const wb = XLSX.utils.book_new();
            const dateStr = new Date().toISOString().split('T')[0];
            const isOffice = currentUserRole === 'office' && !!currentOfficeScope;
            const reportTitle = isOffice 
                ? `${currentOfficeScope} Live Data Export (${dateStr})`
                : `Live Data Export (${dateStr})`;
            const filename = isOffice 
                ? `BISU_${currentOfficeScope.replace(/[^a-zA-Z0-9]/g, '_')}_Feedback_Data_${dateStr}.xlsx`
                : `BISU_Feedback_Data_${dateStr}.xlsx`;

            // 1. Executive Summary Sheet
            const summaryWs = buildExecutiveSummarySheet(feedbacks, complaints, reportTitle);
            XLSX.utils.book_append_sheet(wb, summaryWs, "Executive Summary");

            // 2. Feedback Data Sheet
            if (feedbacks.length > 0) {
                const data = feedbacks.map(f => {
                    const score = f.mean_score ? parseFloat(f.mean_score) : null;
                    return {
                        'Submission Timestamp': f.created_at ? new Date(f.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A',
                        'Client Name': f.client_name || (f.ratings && f.ratings.client_name) || 'Anonymous',
                        'Target Office': f.office_visited || 'N/A',
                        'Service Availed': f.service_availed || 'N/A',
                        'Client Category': f.client_type || 'N/A',
                        'Sex / Gender': f.sex || 'N/A',
                        'Region of Residence': f.region_of_residence || (f.ratings && f.ratings.region_of_residence) || 'N/A',
                        'Served By': f.served_by || (f.ratings && f.ratings.served_by) || 'N/A',
                        'Mean Rating Score': score ? score.toFixed(2) : 'N/A',
                        'Rating Assessment': score ? getDesc(score) : 'N/A',
                        'CC1 (Awareness)': f.cc1 ?? 'N/A',
                        'CC2 (Visibility)': f.cc2 ?? 'N/A',
                        'CC3 (Helpfulness)': f.cc3 ?? 'N/A',
                        'Client Commendations': f.commendations || 'None',
                        'Suggestions / Feedback': f.suggestions || 'None',
                        'Feedback Category': f.type || 'Feedback'
                    };
                });
                const ws = buildFormattedExcelSheet(data, "CLIENT SATISFACTION FEEDBACK LOGS", `Report Scope: ${reportTitle} | Total Records: ${feedbacks.length}`);
                XLSX.utils.book_append_sheet(wb, ws, "Feedback Data");
            }

            // 3. Formal Complaints Sheet
            if (complaints.length > 0) {
                const compData = complaints.map(c => ({
                    'Date Filed': c.created_at ? new Date(c.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A',
                    'Complainant Name': c.name || 'Anonymous',
                    'Contact Details': c.contact_details || 'N/A',
                    'Incident Location': c.place_of_incident || 'Unspecified',
                    'Incident Date': c.date_of_incident || 'Unspecified',
                    'Subject / Act Complained Of': c.details_of_complaint || 'N/A',
                    'Detailed Narrative': c.narrative_report || 'N/A',
                    'Expected Resolution': c.desired_outcome || 'N/A'
                }));
                const wsComp = buildFormattedExcelSheet(compData, "FORMAL COMPLAINTS LOGS", `Report Scope: ${reportTitle} | Total Complaints: ${complaints.length}`);
                XLSX.utils.book_append_sheet(wb, wsComp, "Formal Complaints");
            }

            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            const dataUri = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + wbout;

            Swal.close();
            setTimeout(() => {
                triggerDownload(dataUri, filename);
                showToast('Formatted Excel Report Exported.', 'success');
            }, 300);
        } catch (err) {
            console.error(err);
            Swal.close();
            showToast('Export failed.', 'error');
        }
    }

    function generateSummaryReportHTMLString(feedbacks = [], complaints = [], title = 'MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT') {
        const activeDimensions = formConfig?.dimensions?.['en'] || [
            { id: 'responsiveness', label: '1. Responsiveness' },
            { id: 'reliability', label: '2. Reliability (Quality)' },
            { id: 'access_facilities', label: '3. Access & Facilities' },
            { id: 'communication', label: '4. Communication' },
            { id: 'costs', label: '5. Costs' },
            { id: 'integrity', label: '6. Integrity' },
            { id: 'assurance', label: '7. Assurance' },
            { id: 'outcome', label: '8. Outcome' }
        ];

        // --- TABLE A CALCULATIONS ---
        const groupedA = {};
        let totalsA = { cust: 0, m: 0, f: 0, cit: 0, bus: 0, gov: 0 };
        let ccTotalsA = new Array(12).fill(0);

        feedbacks.forEach(row => {
            const off = row.office_visited || 'General Office';
            if (!groupedA[off]) {
                groupedA[off] = { cust: 0, m: 0, f: 0, cit: 0, bus: 0, gov: 0, cc: new Array(12).fill(0) };
            }
            const g = groupedA[off];
            g.cust++; totalsA.cust++;
            
            const sex = (row.sex || '').toLowerCase();
            if (sex === 'male' || sex === 'm') { g.m++; totalsA.m++; }
            else if (sex === 'female' || sex === 'f') { g.f++; totalsA.f++; }

            const cType = (row.client_type || '').toLowerCase();
            if (cType.includes('citizen')) { g.cit++; totalsA.cit++; }
            else if (cType.includes('business')) { g.bus++; totalsA.bus++; }
            else if (cType.includes('gov')) { g.gov++; totalsA.gov++; }

            const cc1Val = parseInt(row.cc1);
            if (cc1Val >= 1 && cc1Val <= 4) { g.cc[cc1Val - 1]++; ccTotalsA[cc1Val - 1]++; }
            const cc2Val = parseInt(row.cc2);
            if (cc2Val >= 1 && cc2Val <= 5) { g.cc[4 + (cc2Val - 1)]++; ccTotalsA[4 + (cc2Val - 1)]++; }
            const cc3Val = parseInt(row.cc3);
            if (cc3Val >= 1 && cc3Val <= 3) { g.cc[9 + (cc3Val - 1)]++; ccTotalsA[9 + (cc3Val - 1)]++; }
        });

        let tableARows = '';
        for (let off in groupedA) {
            const g = groupedA[off];
            const ccTds = g.cc.map(v => `<td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${v}</td>`).join('');
            tableARows += `
                <tr>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:left; font-weight:bold; font-family:Arial, sans-serif;">${escapeHtml(off)}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-weight:bold; font-family:Arial, sans-serif;">${g.cust}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${g.m}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${g.f}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${g.cit}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${g.bus}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${g.gov}</td>
                    ${ccTds}
                </tr>
            `;
        }

        if (Object.keys(groupedA).length === 0) {
            tableARows = `<tr><td colspan="19" border="1" style="border:1pt solid #000; padding:8px; text-align:center; color:#64748b; font-family:Arial, sans-serif;">No feedback records found for Table A.</td></tr>`;
        }

        const ccFootTds = ccTotalsA.map(v => `<td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${v}</td>`).join('');
        const tableAFoot = `
            <tr bgcolor="#F1F5F9" style="font-weight:bold; background-color:#f1f5f9; font-family:Arial, sans-serif;">
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:right; font-family:Arial, sans-serif;">Overall Rating</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsA.cust}</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsA.m}</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsA.f}</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsA.cit}</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsA.bus}</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsA.gov}</td>
                ${ccFootTds}
            </tr>
        `;

        // --- TABLE B CALCULATIONS ---
        const officeStatsB = {};
        let totalsB = { cust: 0, meanScore: 0, dims: {} };
        activeDimensions.forEach(d => totalsB.dims[d.id] = 0);

        feedbacks.forEach(row => {
            const off = row.office_visited || 'General Office';
            if (!officeStatsB[off]) {
                officeStatsB[off] = { count: 0, meanScore: 0, dims: {} };
                activeDimensions.forEach(d => officeStatsB[off].dims[d.id] = 0);
            }
            const g = officeStatsB[off];
            g.count++;
            totalsB.cust++;
            
            const r = row.ratings || row || {};
            let sumRow = 0;
            let cntRow = 0;
            activeDimensions.forEach(d => {
                const val = parseInt(r[d.id] || 0);
                g.dims[d.id] += val;
                totalsB.dims[d.id] += val;
                if (val > 0) { sumRow += val; cntRow++; }
            });

            const mScore = row.mean_score ? parseFloat(row.mean_score) : (cntRow > 0 ? sumRow / cntRow : 0);
            g.meanScore += mScore;
            totalsB.meanScore += mScore;
        });

        const getDesc = (score) => {
            if (score >= 4.5) return 'OUTSTANDING';
            if (score >= 3.5) return 'VERY SATISFACTORY';
            if (score >= 2.5) return 'SATISFACTORY';
            if (score >= 1.5) return 'FAIR';
            return 'POOR';
        };

        let tableBRows = '';
        for (let off in officeStatsB) {
            const g = officeStatsB[off];
            const rowAvg = g.count > 0 ? (g.meanScore / g.count).toFixed(2) : "0.00";
            const dimsTds = activeDimensions.map(d => {
                const avg = g.count > 0 ? (g.dims[d.id] / g.count).toFixed(2) : "0.00";
                return `<td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${avg}</td>`;
            }).join('');

            tableBRows += `
                <tr>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:left; font-weight:bold; font-family:Arial, sans-serif;">${escapeHtml(off)}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-weight:bold; font-family:Arial, sans-serif;">${g.count}</td>
                    ${dimsTds}
                    <td border="1" bgcolor="#EFF6FF" style="border:1pt solid #000; padding:4px; text-align:center; font-weight:bold; background-color:#eff6ff; font-family:Arial, sans-serif;">${rowAvg}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-weight:bold; font-family:Arial, sans-serif;">${getDesc(parseFloat(rowAvg))}</td>
                </tr>
            `;
        }

        if (Object.keys(officeStatsB).length === 0) {
            tableBRows = `<tr><td colspan="${activeDimensions.length + 4}" border="1" style="border:1pt solid #000; padding:8px; text-align:center; color:#64748b; font-family:Arial, sans-serif;">No feedback records found for Table B.</td></tr>`;
        }

        const dimsFootTds = activeDimensions.map(d => {
            const avg = totalsB.cust > 0 ? (totalsB.dims[d.id] / totalsB.cust).toFixed(2) : "0.00";
            return `<td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${avg}</td>`;
        }).join('');
        const totalAvgB = totalsB.cust > 0 ? (totalsB.meanScore / totalsB.cust).toFixed(2) : "0.00";

        const tableBFoot = `
            <tr bgcolor="#F1F5F9" style="font-weight:bold; background-color:#f1f5f9; font-family:Arial, sans-serif;">
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:left; font-family:Arial, sans-serif;">Overall Rating</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${totalsB.cust}</td>
                ${dimsFootTds}
                <td border="1" bgcolor="#EFF6FF" style="border:1pt solid #000; padding:4px; text-align:center; background-color:#eff6ff; font-family:Arial, sans-serif;">${totalAvgB}</td>
                <td border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${getDesc(parseFloat(totalAvgB))}</td>
            </tr>
        `;

        // --- TABLE C (COMMENDATIONS & SUGGESTIONS) ---
        const comms = feedbacks.filter(f => (f.suggestions && f.suggestions.trim()) || (f.commendations && f.commendations.trim()));
        let tableCRows = comms.map(c => `
            <tr>
                <td border="1" style="border:1pt solid #000; padding:4px; text-align:left; font-weight:bold; font-family:Arial, sans-serif;">${escapeHtml(c.office_visited || 'N/A')}</td>
                <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${escapeHtml(c.client_type || 'N/A')}</td>
                <td border="1" style="border:1pt solid #000; padding:4px; text-align:left; font-family:Arial, sans-serif;">${escapeHtml(c.commendations || 'None')}</td>
                <td border="1" style="border:1pt solid #000; padding:4px; text-align:left; font-family:Arial, sans-serif;">${escapeHtml(c.suggestions || 'None')}</td>
            </tr>
        `).join('');

        if (!tableCRows) {
            tableCRows = `<tr><td colspan="4" border="1" style="border:1pt solid #000; padding:6px; text-align:center; color:#64748b; font-family:Arial, sans-serif;">No commendations or suggestions submitted.</td></tr>`;
        }

        // --- FORMAL COMPLAINTS ---
        let complaintsSection = '';
        if (complaints.length > 0) {
            const compRows = complaints.map(c => `
                <tr>
                    <td border="1" style="border:1pt solid #000; padding:4px; font-weight:bold; font-family:Arial, sans-serif;">${escapeHtml(c.name || 'Anonymous')}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; font-family:Arial, sans-serif;">${escapeHtml(c.place_of_incident || 'N/A')}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; font-family:Arial, sans-serif;">${escapeHtml(c.details_of_complaint || c.narrative_report || 'N/A')}</td>
                    <td border="1" style="border:1pt solid #000; padding:4px; text-align:center; font-family:Arial, sans-serif;">${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `).join('');

            complaintsSection = `
                <div style="margin-top:24px;">
                    <div style="text-align:center; margin-bottom:12px;">
                        <div style="font-size:11pt; font-weight:bold; color:#991b1b; text-transform:uppercase; font-family:Arial, sans-serif;">FORMAL COMPLAINTS LOG (${complaints.length})</div>
                    </div>
                    <table border="1" cellpadding="3" cellspacing="0" style="width:100%; border-collapse:collapse; border:1pt solid #000; font-size:8pt; font-family:Arial, sans-serif;">
                        <thead>
                            <tr bgcolor="#FEE2E2" style="background-color:#fee2e2; font-weight:bold; text-align:center;">
                                <th border="1" bgcolor="#FEE2E2" style="border:1pt solid #000; padding:4px; width:20%; font-family:Arial, sans-serif;">COMPLAINANT</th>
                                <th border="1" bgcolor="#FEE2E2" style="border:1pt solid #000; padding:4px; width:20%; font-family:Arial, sans-serif;">LOCATION</th>
                                <th border="1" bgcolor="#FEE2E2" style="border:1pt solid #000; padding:4px; width:45%; font-family:Arial, sans-serif;">NARRATIVE / DETAILS</th>
                                <th border="1" bgcolor="#FEE2E2" style="border:1pt solid #000; padding:4px; width:15%; font-family:Arial, sans-serif;">FILING DATE</th>
                            </tr>
                        </thead>
                        <tbody>${compRows}</tbody>
                    </table>
                </div>
            `;
        }

        return `
            <div style="font-family: Arial, sans-serif; color: #000; padding: 10px;">
                <div style="text-align:center; margin-bottom: 12px; page-break-after: avoid; break-after: avoid;">
                    <div style="font-size:11pt; font-weight:bold; color:#0f172a; text-transform:uppercase; font-family:Arial, sans-serif;">A. CITIZEN'S CHARTER SUMMARY RESULT</div>
                    <div style="font-size:8pt; font-weight:bold; color:#475569; text-transform:uppercase; font-family:Arial, sans-serif;">DEMOGRAPHICS & CHARTER KNOWLEDGE BREAKDOWN</div>
                </div>

                <table border="1" cellpadding="3" cellspacing="0" style="width:100%; border-collapse:collapse; border:1pt solid #000; font-size:7.5pt; margin-bottom:20px; font-family:Arial, sans-serif; mso-border-alt:solid windowtext .5pt;">
                    <thead>
                        <tr bgcolor="#F1F5F9" style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
                            <th border="1" bgcolor="#F1F5F9" rowspan="2" style="border:1pt solid #000; padding:4px; text-align:left; width:18%; font-family:Arial, sans-serif;">OFFICES</th>
                            <th border="1" bgcolor="#F1F5F9" rowspan="2" style="border:1pt solid #000; padding:4px; width:6%; font-family:Arial, sans-serif;">CUSTOMERS (F)</th>
                            <th border="1" bgcolor="#F1F5F9" colspan="2" style="border:1pt solid #000; padding:4px; width:8%; font-family:Arial, sans-serif;">GENDER</th>
                            <th border="1" bgcolor="#F1F5F9" colspan="3" style="border:1pt solid #000; padding:4px; width:15%; font-family:Arial, sans-serif;">CLIENT TYPE</th>
                            <th border="1" bgcolor="#F1F5F9" colspan="4" style="border:1pt solid #000; padding:4px; width:16%; font-family:Arial, sans-serif;">CC1 (AWARENESS)</th>
                            <th border="1" bgcolor="#F1F5F9" colspan="5" style="border:1pt solid #000; padding:4px; width:20%; font-family:Arial, sans-serif;">CC2 (VISIBILITY)</th>
                            <th border="1" bgcolor="#F1F5F9" colspan="3" style="border:1pt solid #000; padding:4px; width:17%; font-family:Arial, sans-serif;">CC3 (HELPFULNESS)</th>
                        </tr>
                        <tr bgcolor="#F1F5F9" style="background-color:#f1f5f9; font-weight:bold; text-align:center; font-size:7pt;">
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">M</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">F</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:5%; font-family:Arial, sans-serif;">CITIZEN</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:5%; font-family:Arial, sans-serif;">BUSINESS</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:5%; font-family:Arial, sans-serif;">GOVERNMENT</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 1-1</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 1-2</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 1-3</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 1-4</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 2-1</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 2-2</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 2-3</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 2-4</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:4%; font-family:Arial, sans-serif;">CC 2-5</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:5.66%; font-family:Arial, sans-serif;">CC 3-1</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:5.66%; font-family:Arial, sans-serif;">CC 3-2</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:2px; width:5.68%; font-family:Arial, sans-serif;">CC 3-3</th>
                        </tr>
                    </thead>
                    <tbody>${tableARows}</tbody>
                    <tfoot>${tableAFoot}</tfoot>
                </table>

                <div style="text-align:center; margin-bottom: 12px; margin-top:24px; page-break-after: avoid; break-after: avoid;">
                    <div style="font-size:11pt; font-weight:bold; color:#0f172a; text-transform:uppercase; font-family:Arial, sans-serif;">B. CSF MONTHLY RATING</div>
                    <div style="font-size:8pt; font-weight:bold; color:#475569; text-transform:uppercase; font-family:Arial, sans-serif;">SERVICE ASSESSMENT METRICS ACROSS 8 DIMENSIONS</div>
                </div>

                <table border="1" cellpadding="3" cellspacing="0" style="width:100%; border-collapse:collapse; border:1pt solid #000; font-size:7.5pt; margin-bottom:20px; font-family:Arial, sans-serif; mso-border-alt:solid windowtext .5pt;">
                    <thead>
                        <tr bgcolor="#F1F5F9" style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:left; width:18%; font-family:Arial, sans-serif;">OFFICES</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; width:6%; font-family:Arial, sans-serif;">NUMBER OF<br>CUSTOMERS (F)</th>
                            ${activeDimensions.map(d => {
                                let labelText = d.label;
                                if (labelText.includes('.')) labelText = labelText.split('.').slice(1).join('.').trim();
                                return `<th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; width:7%; font-family:Arial, sans-serif;">${escapeHtml(labelText.toUpperCase())}</th>`;
                            }).join('')}
                            <th border="1" bgcolor="#EFF6FF" style="border:1pt solid #000; padding:4px; background-color:#eff6ff; width:8%; font-family:Arial, sans-serif;">MEAN<br>SATISFACTION</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; width:12%; font-family:Arial, sans-serif;">DESCRIPTION</th>
                        </tr>
                    </thead>
                    <tbody>${tableBRows}</tbody>
                    <tfoot>${tableBFoot}</tfoot>
                </table>

                <div style="text-align:center; margin-bottom: 12px; margin-top:24px; page-break-after: avoid; break-after: avoid;">
                    <div style="font-size:11pt; font-weight:bold; color:#0f172a; text-transform:uppercase; font-family:Arial, sans-serif;">C. CSF COMMENDATIONS AND SUGGESTIONS</div>
                </div>

                <table border="1" cellpadding="3" cellspacing="0" style="width:100%; border-collapse:collapse; border:1pt solid #000; font-size:7.5pt; margin-bottom:20px; font-family:Arial, sans-serif; mso-border-alt:solid windowtext .5pt;">
                    <thead>
                        <tr bgcolor="#F1F5F9" style="background-color:#f1f5f9; font-weight:bold; text-align:center;">
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:left; width:20%; font-family:Arial, sans-serif;">OFFICES</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; width:15%; font-family:Arial, sans-serif;">CLIENT TYPE</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:left; width:32.5%; font-family:Arial, sans-serif;">COMMENDATIONS</th>
                            <th border="1" bgcolor="#F1F5F9" style="border:1pt solid #000; padding:4px; text-align:left; width:32.5%; font-family:Arial, sans-serif;">SUGGESTIONS</th>
                        </tr>
                    </thead>
                    <tbody>${tableCRows}</tbody>
                </table>

                ${complaintsSection}

                <!-- Institutional Signatures Footer (3 Roles) -->
                <div style="margin-top:30px; page-break-inside:avoid; font-family:Arial, sans-serif;">
                    <table border="0" cellpadding="0" cellspacing="0" style="width:100%; border:none; border-collapse:collapse;">
                        <tr style="border:none;">
                            <td border="0" style="border:none; width:33%; text-align:center; vertical-align:top; font-family:Arial, sans-serif;">
                                <div style="font-size:8.5pt; font-weight:bold; text-align:left;">Prepared by:</div>
                                <div style="margin-top:35px; border-bottom:1.5pt solid #000; width:80%; margin-left:auto; margin-right:auto;"></div>
                                <div style="font-weight:bold; font-size:8.5pt; margin-top:4px; text-transform:uppercase;">CSAT CHAIRPERSON</div>
                                <div style="font-size:7.5pt; color:#475569; font-style:italic;">Chairperson, Customer Satisfaction Assessment Team</div>
                            </td>
                            <td border="0" style="border:none; width:34%; text-align:center; vertical-align:top; font-family:Arial, sans-serif;">
                                <div style="font-size:8.5pt; font-weight:bold; text-align:left;">Verified by:</div>
                                <div style="margin-top:35px; border-bottom:1.5pt solid #000; width:80%; margin-left:auto; margin-right:auto;"></div>
                                <div style="font-weight:bold; font-size:8.5pt; margin-top:4px; text-transform:uppercase;">CAMPUS QA DIRECTOR</div>
                                <div style="font-size:7.5pt; color:#475569; font-style:italic;">Campus Quality Assurance Director</div>
                            </td>
                            <td border="0" style="border:none; width:33%; text-align:center; vertical-align:top; font-family:Arial, sans-serif;">
                                <div style="font-size:8.5pt; font-weight:bold; text-align:left;">Approved by:</div>
                                <div style="margin-top:35px; border-bottom:1.5pt solid #000; width:80%; margin-left:auto; margin-right:auto;"></div>
                                <div style="font-weight:bold; font-size:8.5pt; margin-top:4px; text-transform:uppercase;">CAMPUS DIRECTOR</div>
                                <div style="font-size:7.5pt; color:#475569; font-style:italic;">Campus Director, BISU Calape</div>
                            </td>
                        </tr>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" style="width:100%; border:none; border-collapse:collapse; margin-top:16px; border-top:1pt solid #000; padding-top:4px;">
                        <tr style="border:none;">
                            <td border="0" style="border:none; text-align:left; font-size:7.5pt; color:#475569; padding-top:4px; font-family:Arial, sans-serif;">
                                Document Code: <strong>F-AQA-CSF-001</strong> | Revision: <strong>03</strong> | Effectivity: <strong>September 2025</strong>
                            </td>
                            <td border="0" style="border:none; text-align:right; font-size:7.5pt; color:#475569; font-weight:bold; padding-top:4px; font-family:Arial, sans-serif;">
                                Bohol Island State University &bull; Quality Management System
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
    }

    async function generateDOCXForDataset(feedbacks = [], complaints = [], title = 'MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT', filenamePrefix = 'BISU_Report') {
        if (feedbacks.length === 0 && complaints.length === 0) {
            showToast('No data available to export.', 'error');
            return;
        }

        Swal.fire({
            title: 'Generating Word Document',
            html: 'Preparing institutional Word summary report...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            customClass: { popup: 'rounded-3xl shadow-xl border-t-4 border-blue-600' }
        });

        try {
            const periodStr = getAssessmentPeriodStr(title, feedbacks, complaints);
            const summaryBodyHtml = generateSummaryReportHTMLString(feedbacks, complaints, title);

            if (window.EMBEDDED_LOGOS) {
                if (!cachedLogos.bisu && window.EMBEDDED_LOGOS.bisu) cachedLogos.bisu = window.EMBEDDED_LOGOS.bisu;
                if (!cachedLogos.bagongPilipinas && window.EMBEDDED_LOGOS.bagongPilipinas) cachedLogos.bagongPilipinas = window.EMBEDDED_LOGOS.bagongPilipinas;
                if (!cachedLogos.tuv && window.EMBEDDED_LOGOS.tuv) cachedLogos.tuv = window.EMBEDDED_LOGOS.tuv;
            }

            let bisuLogo = cachedLogos.bisu;
            let bagongPilipinasLogo = cachedLogos.bagongPilipinas;
            let tuvLogo = cachedLogos.tuv;

            if (!bisuLogo || !bisuLogo.startsWith('data:image/png')) {
                bisuLogo = await fetchAsPngDataUrl('/images/BISU_sm.png');
                if (bisuLogo) cachedLogos.bisu = bisuLogo;
            }
            if (!bagongPilipinasLogo || !bagongPilipinasLogo.startsWith('data:image/png')) {
                bagongPilipinasLogo = await fetchAsPngDataUrl('/images/BP_sm.png');
                if (bagongPilipinasLogo) cachedLogos.bagongPilipinas = bagongPilipinasLogo;
            }
            if (!tuvLogo || !tuvLogo.startsWith('data:image/png')) {
                tuvLogo = await fetchAsPngDataUrl('/images/TUV_sm.png');
                if (tuvLogo) cachedLogos.tuv = tuvLogo;
            }

            function cleanBase64(dataUrl) {
                if (!dataUrl || typeof dataUrl !== 'string') return '';
                const parts = dataUrl.split(',');
                return parts.length > 1 ? parts[1].replace(/[\r\n\s]/g, '') : parts[0].replace(/[\r\n\s]/g, '');
            }

            const bisuBase64 = cleanBase64(bisuLogo);
            const bpBase64 = cleanBase64(bagongPilipinasLogo);
            const tuvBase64 = cleanBase64(tuvLogo);

            const bisuImgTag = bisuBase64 ? `<img src="cid:bisu_logo.png" width="55" height="55" style="width: 55px; height: 55px; max-width: 55px; max-height: 55px; border: none;" alt="BISU Logo" />` : '';
            const bagongPilipinasImgTag = bpBase64 ? `<img src="cid:bp_logo.png" width="55" height="55" style="width: 55px; height: 55px; max-width: 55px; max-height: 55px; border: none; margin-right: 4px;" alt="Bagong Pilipinas Logo" />` : '';
            const tuvImgTag = tuvBase64 ? `<img src="cid:tuv_logo.png" width="55" height="55" style="width: 55px; height: 55px; max-width: 55px; max-height: 55px; border: none;" alt="TÜV Rheinland Logo" />` : '';
            
            let docHtml = `
                <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office'
                      xmlns:w='urn:schemas-microsoft-microsoft-com:office:word'
                      xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>${escapeHtml(title)}</title>
                    <!--[if gte mso 9]>
                    <xml>
                     <w:WordDocument>
                      <w:View>Print</w:View>
                      <w:Zoom>100</w:Zoom>
                      <w:DoNotOptimizeForBrowser/>
                     </w:WordDocument>
                    </xml>
                    <![endif]-->
                    <style>
                        @page WordSection1 {
                            size: 11.0in 8.5in;
                            mso-page-orientation: landscape;
                            margin: 0.35in 0.4in 0.35in 0.4in;
                            mso-header-margin: 0.2in;
                            mso-footer-margin: 0.2in;
                        }
                        div.WordSection1 {
                            page: WordSection1;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 8pt;
                            color: #000000;
                            line-height: 1.25;
                            background-color: #ffffff;
                        }
                        table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            margin-bottom: 14pt;
                            font-size: 7.5pt;
                            mso-table-lspace: 0pt;
                            mso-table-rspace: 0pt;
                        }
                        th {
                            background-color: #f1f5f9 !important;
                            color: #000000 !important;
                            font-weight: bold !important;
                            padding: 4pt 3pt !important;
                            border: 1pt solid #000000 !important;
                            mso-border-alt: solid windowtext .5pt;
                            text-align: center !important;
                            font-size: 7.5pt !important;
                            font-family: Arial, sans-serif !important;
                            text-transform: uppercase !important;
                        }
                        td {
                            border: 1pt solid #000000 !important;
                            mso-border-alt: solid windowtext .5pt;
                            padding: 3.5pt 3pt !important;
                            vertical-align: middle !important;
                            color: #000000 !important;
                            font-size: 7.5pt !important;
                            font-family: Arial, sans-serif !important;
                        }
                    </style>
                </head>
                <body lang="EN-US" style="tab-interval:.5in;">
                <div class="WordSection1">
                    <!-- Trio Institutional Logos Header Table -->
                    <table style="width: 100%; border: none !important; border-collapse: collapse; margin-bottom: 10px;">
                        <tr style="border: none !important;">
                            <td style="border: none !important; width: 15%; text-align: left; vertical-align: middle; padding: 0;">
                                ${bisuImgTag}
                            </td>
                            <td style="border: none !important; width: 70%; text-align: center; vertical-align: middle; padding: 0;">
                                <div style="font-size: 8.5pt; font-weight: bold; color: #475569; text-transform: uppercase; font-family: Arial, sans-serif;">REPUBLIC OF THE PHILIPPINES</div>
                                <div style="font-size: 13.5pt; font-weight: bold; color: #000000; margin: 2px 0; text-transform: uppercase; font-family: Arial, sans-serif;">BOHOL ISLAND STATE UNIVERSITY</div>
                                <div style="font-size: 10pt; font-weight: bold; color: #1e293b; text-transform: uppercase; font-family: Arial, sans-serif;">CALAPE CAMPUS</div>
                                <div style="font-size: 8.5pt; font-style: italic; color: #475569; font-family: Arial, sans-serif;">San Isidro, Calape, Bohol &bull; Quality Management System</div>
                            </td>
                            <td style="border: none !important; width: 15%; text-align: right; vertical-align: middle; padding: 0;">
                                ${bagongPilipinasImgTag}
                                ${tuvImgTag}
                            </td>
                        </tr>
                    </table>

                    <!-- Document Title Header -->
                    <div style="text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1pt solid #000000; border-bottom: 1pt solid #000000; padding-bottom: 8px; margin-bottom: 16px; width: 100%; font-family: Arial, sans-serif;">
                        <div style="font-size: 11pt; font-weight: bold; color: #000000; text-transform: uppercase; font-family: Arial, sans-serif;">${escapeHtml(title.toUpperCase())}</div>
                        <div style="font-size: 8.5pt; font-weight: bold; color: #334155; margin-top: 4px; font-family: Arial, sans-serif;">
                            Assessment Period: <span style="color: #000000; font-weight: bold; font-family: Arial, sans-serif;">${escapeHtml(periodStr)}</span> &bull; ISO 9001:2015 Certified
                        </div>
                    </div>

                    ${summaryBodyHtml}
                </div>
                </body>
                </html>
            `;

            const boundary = "----=_NextPart_BISU_Word_Doc";
            let mhtmlParts = [];

            mhtmlParts.push("MIME-Version: 1.0");
            mhtmlParts.push(`Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`);
            mhtmlParts.push("");

            mhtmlParts.push(`--${boundary}`);
            mhtmlParts.push('Content-Type: text/html; charset="utf-8"');
            mhtmlParts.push('Content-Transfer-Encoding: 8bit');
            mhtmlParts.push('Content-Location: http://document/document.htm');
            mhtmlParts.push("");
            mhtmlParts.push(docHtml);
            mhtmlParts.push("");

            if (bisuBase64) {
                const bisuChunked = (bisuBase64.match(/.{1,76}/g) || [bisuBase64]).join('\r\n');
                mhtmlParts.push(`--${boundary}`);
                mhtmlParts.push('Content-Type: image/png');
                mhtmlParts.push('Content-Transfer-Encoding: base64');
                mhtmlParts.push('Content-Location: bisu_logo.png');
                mhtmlParts.push('Content-ID: <bisu_logo.png>');
                mhtmlParts.push("");
                mhtmlParts.push(bisuChunked);
                mhtmlParts.push("");
            }

            if (bpBase64) {
                const bpChunked = (bpBase64.match(/.{1,76}/g) || [bpBase64]).join('\r\n');
                mhtmlParts.push(`--${boundary}`);
                mhtmlParts.push('Content-Type: image/png');
                mhtmlParts.push('Content-Transfer-Encoding: base64');
                mhtmlParts.push('Content-Location: bp_logo.png');
                mhtmlParts.push('Content-ID: <bp_logo.png>');
                mhtmlParts.push("");
                mhtmlParts.push(bpChunked);
                mhtmlParts.push("");
            }

            if (tuvBase64) {
                const tuvChunked = (tuvBase64.match(/.{1,76}/g) || [tuvBase64]).join('\r\n');
                mhtmlParts.push(`--${boundary}`);
                mhtmlParts.push('Content-Type: image/png');
                mhtmlParts.push('Content-Transfer-Encoding: base64');
                mhtmlParts.push('Content-Location: tuv_logo.png');
                mhtmlParts.push('Content-ID: <tuv_logo.png>');
                mhtmlParts.push("");
                mhtmlParts.push(tuvChunked);
                mhtmlParts.push("");
            }

            mhtmlParts.push(`--${boundary}--`);

            const mhtmlContent = mhtmlParts.join("\r\n");
            const blob = new Blob([mhtmlContent], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Swal.close();
            showToast('Word Summary Report Exported (.doc / .docx format).', 'success');
        } catch (err) {
            console.error(err);
            Swal.close();
            showToast('Word Document export failed.', 'error');
        }
    }

    async function generatePDFForDataset(feedbacks = [], complaints = [], title = 'MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT', filenamePrefix = 'BISU_Report') {
        if (feedbacks.length === 0 && complaints.length === 0) {
            showToast('No data available to export.', 'error');
            return;
        }

        Swal.fire({
            title: 'Generating PDF Report',
            html: 'Formatting institutional document layout...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            customClass: { popup: 'rounded-3xl shadow-xl border-t-4 border-[#22007c]' }
        });

        try {
            // Ensure logo cache is initialized
            if (window.EMBEDDED_LOGOS) {
                if (!cachedLogos.bisu && window.EMBEDDED_LOGOS.bisu) cachedLogos.bisu = window.EMBEDDED_LOGOS.bisu;
                if (!cachedLogos.bagongPilipinas && window.EMBEDDED_LOGOS.bagongPilipinas) cachedLogos.bagongPilipinas = window.EMBEDDED_LOGOS.bagongPilipinas;
                if (!cachedLogos.tuv && window.EMBEDDED_LOGOS.tuv) cachedLogos.tuv = window.EMBEDDED_LOGOS.tuv;
            }
            if (!cachedLogos.bisu) {
                cachedLogos.bisu = await fetchAsPngDataUrl('/images/BISU_sm.png');
            }
            if (!cachedLogos.bagongPilipinas) {
                cachedLogos.bagongPilipinas = await fetchAsPngDataUrl('/images/BP_sm.png');
            }
            if (!cachedLogos.tuv) {
                cachedLogos.tuv = await fetchAsPngDataUrl('/images/TUV_sm.png');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');

            // Draw Logos on first page
            if (cachedLogos.bisu && cachedLogos.bisu.startsWith('data:')) {
                try { doc.addImage(cachedLogos.bisu, 'PNG', 20, 6, 16, 16); } catch (e) {}
            }
            if (cachedLogos.tuv && cachedLogos.tuv.startsWith('data:')) {
                try { doc.addImage(cachedLogos.tuv, 'PNG', 242, 6, 16, 16); } catch (e) {}
            }
            if (cachedLogos.bagongPilipinas && cachedLogos.bagongPilipinas.startsWith('data:')) {
                try { doc.addImage(cachedLogos.bagongPilipinas, 'PNG', 260, 6, 16, 16); } catch (e) {}
            }

            // Institutional Header
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Republic of the Philippines', 148, 9, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(22, 18, 117);
            doc.text('BOHOL ISLAND STATE UNIVERSITY', 148, 14, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.text('Calape Campus, Calape, Bohol | Quality Management System', 148, 19, { align: 'center' });

            doc.setDrawColor(51, 65, 85);
            doc.setLineWidth(0.4);
            doc.line(20, 22.5, 277, 22.5);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(title.toUpperCase(), 148, 28, { align: 'center' });

            const periodStr = getAssessmentPeriodStr(title, feedbacks, complaints);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Assessment Period: ${periodStr} | Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Total Records: ${feedbacks.length + complaints.length}`, 148, 33, { align: 'center' });

            let currentY = 38;

            if (feedbacks.length > 0) {
                // Table A: Citizen's Charter Summary Result
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(34, 0, 124);
                doc.text("A. CITIZEN'S CHARTER SUMMARY RESULT", 20, currentY);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(71, 85, 105);
                doc.text("DEMOGRAPHICS & CHARTER KNOWLEDGE BREAKDOWN", 20, currentY + 3.5);
                currentY += 6;

                const tableAHeaders = [
                    [
                        { content: 'OFFICE / UNIT', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
                        { content: 'CUST (F)', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                        { content: 'GENDER', colSpan: 2, styles: { halign: 'center' } },
                        { content: 'CLIENT TYPE', colSpan: 3, styles: { halign: 'center' } },
                        { content: 'CC1 (AWARENESS)', colSpan: 4, styles: { halign: 'center' } },
                        { content: 'CC2 (VISIBILITY)', colSpan: 5, styles: { halign: 'center' } },
                        { content: 'CC3 (HELPFULNESS)', colSpan: 3, styles: { halign: 'center' } }
                    ],
                    [
                        'M', 'F', 'CIT', 'BUS', 'GOV',
                        '1-1', '1-2', '1-3', '1-4',
                        '2-1', '2-2', '2-3', '2-4', '2-5',
                        '3-1', '3-2', '3-3'
                    ]
                ];

                const groupedA = {};
                let totalsA = { cust: 0, m: 0, f: 0, cit: 0, bus: 0, gov: 0 };
                let ccTotalsA = new Array(12).fill(0);

                feedbacks.forEach(row => {
                    const off = row.office_visited || 'General Office';
                    if (!groupedA[off]) {
                        groupedA[off] = { cust: 0, m: 0, f: 0, cit: 0, bus: 0, gov: 0, cc: new Array(12).fill(0) };
                    }
                    const g = groupedA[off];
                    g.cust++; totalsA.cust++;
                    const sex = (row.sex || '').toLowerCase();
                    if (sex === 'male' || sex === 'm') { g.m++; totalsA.m++; }
                    else if (sex === 'female' || sex === 'f') { g.f++; totalsA.f++; }

                    const cType = (row.client_type || '').toLowerCase();
                    if (cType.includes('citizen')) { g.cit++; totalsA.cit++; }
                    else if (cType.includes('business')) { g.bus++; totalsA.bus++; }
                    else if (cType.includes('gov')) { g.gov++; totalsA.gov++; }

                    const cc1Val = parseInt(row.cc1);
                    if (cc1Val >= 1 && cc1Val <= 4) { g.cc[cc1Val - 1]++; ccTotalsA[cc1Val - 1]++; }
                    const cc2Val = parseInt(row.cc2);
                    if (cc2Val >= 1 && cc2Val <= 5) { g.cc[4 + (cc2Val - 1)]++; ccTotalsA[4 + (cc2Val - 1)]++; }
                    const cc3Val = parseInt(row.cc3);
                    if (cc3Val >= 1 && cc3Val <= 3) { g.cc[9 + (cc3Val - 1)]++; ccTotalsA[9 + (cc3Val - 1)]++; }
                });

                const bodyA = Object.keys(groupedA).map(off => {
                    const g = groupedA[off];
                    return [off, g.cust, g.m, g.f, g.cit, g.bus, g.gov, ...g.cc];
                });

                bodyA.push(['Overall Rating', totalsA.cust, totalsA.m, totalsA.f, totalsA.cit, totalsA.bus, totalsA.gov, ...ccTotalsA]);

                doc.autoTable({
                    startY: currentY,
                    head: tableAHeaders,
                    body: bodyA,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [15, 23, 42],
                        fontSize: 6,
                        fontStyle: 'bold',
                        halign: 'center',
                        valign: 'middle',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    styles: {
                        font: 'helvetica',
                        fontSize: 6.5,
                        cellPadding: 1.2,
                        halign: 'center',
                        valign: 'middle',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        textColor: [15, 23, 42]
                    },
                    columnStyles: {
                        0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 }
                    },
                    didParseCell: (data) => {
                        if (data.row.index === bodyA.length - 1) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [241, 245, 249];
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                // Table B: CSF Monthly Rating (8 Dimensions)
                if (currentY > 155) {
                    doc.addPage('a4', 'l');
                    currentY = 16;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(34, 0, 124);
                doc.text("B. CSF MONTHLY RATING", 20, currentY);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(71, 85, 105);
                doc.text("SERVICE ASSESSMENT METRICS ACROSS 8 DIMENSIONS", 20, currentY + 3.5);
                currentY += 6;

                const activeDimensions = formConfig?.dimensions?.['en'] || [
                    { id: 'responsiveness', label: '1. Responsiveness' },
                    { id: 'reliability', label: '2. Reliability (Quality)' },
                    { id: 'access_facilities', label: '3. Access & Facilities' },
                    { id: 'communication', label: '4. Communication' },
                    { id: 'costs', label: '5. Costs' },
                    { id: 'integrity', label: '6. Integrity' },
                    { id: 'assurance', label: '7. Assurance' },
                    { id: 'outcome', label: '8. Outcome' }
                ];

                const tableBHeaders = [
                    'OFFICES',
                    'CUSTOMERS (F)',
                    ...activeDimensions.map(d => {
                        let l = d.label;
                        if (l.includes('.')) l = l.split('.').slice(1).join('.').trim();
                        return l.toUpperCase();
                    }),
                    'MEAN SATISFACTION',
                    'DESCRIPTION'
                ];

                const officeStatsB = {};
                let totalsB = { cust: 0, meanScore: 0, dims: {} };
                activeDimensions.forEach(d => totalsB.dims[d.id] = 0);

                feedbacks.forEach(row => {
                    const off = row.office_visited || 'General Office';
                    if (!officeStatsB[off]) {
                        officeStatsB[off] = { count: 0, meanScore: 0, dims: {} };
                        activeDimensions.forEach(d => officeStatsB[off].dims[d.id] = 0);
                    }
                    const g = officeStatsB[off];
                    g.count++;
                    totalsB.cust++;
                    const r = row.ratings || row || {};
                    let sumRow = 0;
                    let cntRow = 0;
                    activeDimensions.forEach(d => {
                        const val = parseInt(r[d.id] || 0);
                        g.dims[d.id] += val;
                        totalsB.dims[d.id] += val;
                        if (val > 0) { sumRow += val; cntRow++; }
                    });
                    const mScore = row.mean_score ? parseFloat(row.mean_score) : (cntRow > 0 ? sumRow / cntRow : 0);
                    g.meanScore += mScore;
                    totalsB.meanScore += mScore;
                });

                const getDescScore = (score) => {
                    if (score >= 4.5) return 'OUTSTANDING';
                    if (score >= 3.5) return 'VERY SATISFACTORY';
                    if (score >= 2.5) return 'SATISFACTORY';
                    if (score >= 1.5) return 'FAIR';
                    return 'POOR';
                };

                const bodyB = Object.keys(officeStatsB).map(off => {
                    const g = officeStatsB[off];
                    const rowAvg = g.count > 0 ? (g.meanScore / g.count).toFixed(2) : "0.00";
                    return [
                        off,
                        g.count,
                        ...activeDimensions.map(d => g.count > 0 ? (g.dims[d.id] / g.count).toFixed(2) : "0.00"),
                        rowAvg,
                        getDescScore(parseFloat(rowAvg))
                    ];
                });

                const totalAvgB = totalsB.cust > 0 ? (totalsB.meanScore / totalsB.cust).toFixed(2) : "0.00";
                bodyB.push([
                    'Overall Rating',
                    totalsB.cust,
                    ...activeDimensions.map(d => totalsB.cust > 0 ? (totalsB.dims[d.id] / totalsB.cust).toFixed(2) : "0.00"),
                    totalAvgB,
                    getDescScore(parseFloat(totalAvgB))
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [tableBHeaders],
                    body: bodyB,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [15, 23, 42],
                        fontSize: 6,
                        fontStyle: 'bold',
                        halign: 'center',
                        valign: 'middle',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    styles: {
                        font: 'helvetica',
                        fontSize: 6.5,
                        cellPadding: 1.2,
                        halign: 'center',
                        valign: 'middle',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        textColor: [15, 23, 42]
                    },
                    columnStyles: {
                        0: { halign: 'left', fontStyle: 'bold', cellWidth: 38 }
                    },
                    didParseCell: (data) => {
                        if (data.row.index === bodyB.length - 1) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [241, 245, 249];
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                // Table C: CSF Commendations and Suggestions
                if (currentY > 155) {
                    doc.addPage('a4', 'l');
                    currentY = 16;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(34, 0, 124);
                doc.text("C. CSF COMMENDATIONS AND SUGGESTIONS", 20, currentY);
                currentY += 5;

                const comms = feedbacks.filter(f => (f.suggestions && f.suggestions.trim()) || (f.commendations && f.commendations.trim()));
                const tableCHeaders = ['OFFICES', 'CLIENT TYPE', 'COMMENDATIONS', 'SUGGESTIONS'];
                const bodyC = comms.length > 0 ? comms.map(c => [
                    c.office_visited || 'N/A',
                    c.client_type || 'N/A',
                    c.commendations || 'None',
                    c.suggestions || 'None'
                ]) : [['All Offices', 'N/A', 'No commendations or suggestions submitted.', '']];

                doc.autoTable({
                    startY: currentY,
                    head: [tableCHeaders],
                    body: bodyC,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [241, 245, 249],
                        textColor: [15, 23, 42],
                        fontSize: 6.5,
                        fontStyle: 'bold',
                        halign: 'left',
                        valign: 'middle',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    styles: {
                        font: 'helvetica',
                        fontSize: 6.5,
                        cellPadding: 1.5,
                        valign: 'top',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        textColor: [15, 23, 42]
                    },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 40 },
                        1: { cellWidth: 25 },
                        2: { cellWidth: 96 },
                        3: { cellWidth: 96 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;
            }

            // Formal Complaints Log (if any)
            if (complaints.length > 0) {
                if (currentY > 155) {
                    doc.addPage('a4', 'l');
                    currentY = 16;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(153, 27, 27);
                doc.text(`FORMAL COMPLAINTS LOG (${complaints.length})`, 20, currentY);
                currentY += 5;

                const compHeaders = ['COMPLAINANT', 'LOCATION', 'NARRATIVE / DETAILS', 'FILING DATE'];
                const compBody = complaints.map(c => [
                    c.name || 'Anonymous',
                    c.place_of_incident || 'N/A',
                    c.details_of_complaint || c.narrative_report || 'N/A',
                    c.created_at ? new Date(c.created_at).toLocaleDateString('en-US') : 'N/A'
                ]);

                doc.autoTable({
                    startY: currentY,
                    head: [compHeaders],
                    body: compBody,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [254, 226, 226],
                        textColor: [153, 27, 27],
                        fontSize: 6.5,
                        fontStyle: 'bold',
                        halign: 'left',
                        valign: 'middle',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1
                    },
                    styles: {
                        font: 'helvetica',
                        fontSize: 6.5,
                        cellPadding: 1.5,
                        valign: 'top',
                        lineColor: [0, 0, 0],
                        lineWidth: 0.1,
                        textColor: [15, 23, 42]
                    },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 40 },
                        1: { cellWidth: 40 },
                        2: { cellWidth: 142 },
                        3: { halign: 'center', cellWidth: 35 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;
            }

            // Institutional Signatures Block (CSAT Chairperson, Campus QA Director, Campus Director)
            if (currentY + 28 > 192) {
                doc.addPage('a4', 'l');
                currentY = 25;
            } else {
                currentY = Math.max(currentY + 4, 155);
                if (currentY > 165) {
                    currentY = 165;
                }
            }

            const sigY = currentY;

            // Column 1: Prepared by
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text('Prepared by:', 20, sigY);
            doc.line(20, sigY + 12, 95, sigY + 12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('CSAT CHAIRPERSON', 20, sigY + 16);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(71, 85, 105);
            doc.text('Chairperson, Customer Satisfaction Assessment Team', 20, sigY + 20);

            // Column 2: Verified by
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text('Verified by:', 111, sigY);
            doc.line(111, sigY + 12, 186, sigY + 12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('CAMPUS QA DIRECTOR', 111, sigY + 16);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(71, 85, 105);
            doc.text('Campus Quality Assurance Director', 111, sigY + 20);

            // Column 3: Approved by
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(15, 23, 42);
            doc.text('Approved by:', 202, sigY);
            doc.line(202, sigY + 12, 277, sigY + 12);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text('CAMPUS DIRECTOR', 202, sigY + 16);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(71, 85, 105);
            doc.text('Campus Director, BISU Calape', 202, sigY + 20);

            // Document Code Footer and Pagination on ALL pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setDrawColor(51, 65, 85);
                doc.setLineWidth(0.3);
                doc.line(20, 196, 277, 196);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(100, 116, 139);
                doc.text('Document Code: F-AQA-CSF-001 | Revision: 03 | Effectivity: September 2025', 20, 201);
                doc.text(`Page ${i} of ${totalPages} | Bohol Island State University • Quality Management System`, 277, 201, { align: 'right' });
            }

            const dataUri = doc.output('datauristring');
            const dateStr = new Date().toISOString().split('T')[0];
            
            Swal.close();
            setTimeout(() => {
                triggerDownload(dataUri, `${filenamePrefix}_${dateStr}.pdf`);
                showToast('Official PDF Summary Exported.', 'success');
            }, 300);
        } catch (err) {
            console.error(err);
            Swal.close();
            showToast('PDF Export failed.', 'error');
        }
    }

    window.exportDataset = function(feedbacks, complaints, format, title = 'MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT', filenamePrefix = 'BISU_Export') {
        if ((!feedbacks || feedbacks.length === 0) && (!complaints || complaints.length === 0)) {
            showToast('No records available to export.', 'info');
            return;
        }

        if (format === 'excel') {
            downloadArchiveSpreadsheet(feedbacks, complaints, filenamePrefix);
        } else if (format === 'pdf_print' || format === 'pdf') {
            const html = generateSummaryReportHTMLString(feedbacks, complaints, title);
            printHTMLDocument(title, html, feedbacks, complaints);
        } else if (format === 'pdf_file') {
            generatePDFForDataset(feedbacks, complaints, title, filenamePrefix);
        } else if (format === 'docx') {
            generateDOCXForDataset(feedbacks, complaints, title, filenamePrefix);
        }
    };

    window.openExportFormatChooser = async function(feedbacks, complaints, title = 'MONTHLY CUSTOMER SATISFACTION SUMMARY REPORT', filenamePrefix = 'BISU_Export') {
        const fCount = feedbacks?.length || 0;
        const cCount = complaints?.length || 0;
        if (fCount === 0 && cCount === 0) {
            showToast('No records available to export.', 'info');
            return;
        }

        const { value: format } = await Swal.fire({
            title: '<div class="flex items-center justify-center gap-2 text-bisu-blue"><i class="fa-solid fa-file-export text-bisu-gold text-2xl"></i><span class="font-black text-lg">Export Options</span></div>',
            html: `
                <p class="text-xs text-slate-500 font-semibold mb-4">Select export format for <strong>${fCount + cCount} record(s)</strong>:</p>
                <div class="grid grid-cols-1 gap-2.5 text-left font-sans">
                    <button type="button" id="swal-opt-pdf" class="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50/40 transition flex items-center justify-between group cursor-pointer active:scale-98">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform shadow-xs">
                                <i class="fa-solid fa-print"></i>
                            </div>
                            <div>
                                <div class="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-red-900">PDF Summary Report (Print / Save PDF)</div>
                                <div class="text-[11px] text-slate-500 font-medium">Official printable report with Citizen's Charter & CSF Monthly Rating tables</div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-red-600 text-xs"></i>
                    </button>

                    <button type="button" id="swal-opt-docx" class="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition flex items-center justify-between group cursor-pointer active:scale-98">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform shadow-xs">
                                <i class="fa-solid fa-file-word"></i>
                            </div>
                            <div>
                                <div class="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-blue-900">DOCX Word Document</div>
                                <div class="text-[11px] text-slate-500 font-medium">Formatted Word document with summary tables & signatures</div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-600 text-xs"></i>
                    </button>

                    <button type="button" id="swal-opt-excel" class="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition flex items-center justify-between group cursor-pointer active:scale-98">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base group-hover:scale-110 transition-transform shadow-xs">
                                <i class="fa-solid fa-file-excel"></i>
                            </div>
                            <div>
                                <div class="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-emerald-900">Excel Spreadsheet (.xlsx)</div>
                                <div class="text-[11px] text-slate-500 font-medium">With logo banner, summary tab, and clean raw data layout</div>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-emerald-600 text-xs"></i>
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-2xl font-sans' },
            didOpen: (popup) => {
                popup.querySelector('#swal-opt-pdf')?.addEventListener('click', () => Swal.close({ value: 'pdf' }));
                popup.querySelector('#swal-opt-docx')?.addEventListener('click', () => Swal.close({ value: 'docx' }));
                popup.querySelector('#swal-opt-excel')?.addEventListener('click', () => Swal.close({ value: 'excel' }));
            }
        });

        if (format) {
            exportDataset(feedbacks, complaints, format, title, filenamePrefix);
        }
    };

    window.openExportFormatChooserForBatch = function(batchId) {
        const b = (archivedVault.batches || []).find(batch => String(batch.id) === String(batchId));
        let batchFeedbacks = (archivedVault.feedbacks || []).filter(f => String(f.batch_id) === String(batchId));
        let batchComplaints = (archivedVault.complaints || []).filter(c => String(c.batch_id) === String(batchId));

        if (batchFeedbacks.length === 0 && b && Array.isArray(b.feedbacks)) {
            batchFeedbacks = b.feedbacks;
        }
        if (batchComplaints.length === 0 && b && Array.isArray(b.complaints)) {
            batchComplaints = b.complaints;
        }

        const rawTitle = b?.scope || b?.name || `Archive Batch ${batchId}`;
        const title = rawTitle.startsWith('Archive -') || rawTitle.startsWith('Archive Batch') ? rawTitle : `Archive - ${rawTitle}`;
        const filenamePrefix = `BISU_Archive_Batch_${(b?.scope || batchId).replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        openExportFormatChooser(batchFeedbacks, batchComplaints, title, filenamePrefix);
    };

    window.openExportFormatChooserForVault = function(mode = 'all') {
        if (mode === 'batch') {
            const currentFilter = document.getElementById('archived-month-filter')?.value || 'ALL';
            if (currentFilter !== 'ALL') {
                openExportFormatChooserForBatch(currentFilter);
                return;
            }

            let batches = archivedVault.batches || [];
            if (batches.length === 0) {
                const batchMap = new Map();
                [...(archivedVault.feedbacks || []), ...(archivedVault.complaints || [])].forEach(item => {
                    const bId = item.batch_id || 'legacy';
                    if (!batchMap.has(bId)) {
                        batchMap.set(bId, { id: bId, scope: item.scope || 'Archive Batch' });
                    }
                });
                batches = Array.from(batchMap.values());
            }

            if (batches.length === 0) {
                showToast('No archive batches available to export.', 'info');
                return;
            }

            const optionsHtml = batches.map(b => {
                const name = b.scope || b.name || 'Archive Batch';
                const fCount = (archivedVault.feedbacks || []).filter(f => f.batch_id === b.id).length;
                const cCount = (archivedVault.complaints || []).filter(c => c.batch_id === b.id).length;
                return `<option value="${b.id}">${escapeHtml(name)} (${fCount + cCount} records)</option>`;
            }).join('');

            Swal.fire({
                title: 'Export Batch',
                html: `
                    <div class="text-left space-y-3 font-sans">
                        <p class="text-xs text-slate-600 font-medium">Select an archive batch to export:</p>
                        <select id="swal-export-batch-select" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 bg-slate-50 focus:ring-2 focus:ring-bisu-blue focus:outline-none">
                            ${optionsHtml}
                        </select>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Continue <i class="fa-solid fa-arrow-right ml-1"></i>',
                confirmButtonColor: '#22007c',
                cancelButtonText: 'Cancel',
                customClass: { popup: 'rounded-3xl shadow-2xl font-sans' },
                preConfirm: () => {
                    return document.getElementById('swal-export-batch-select')?.value;
                }
            }).then(res => {
                if (res.isConfirmed && res.value) {
                    openExportFormatChooserForBatch(res.value);
                }
            });
        } else {
            const feedbacks = archivedVault.feedbacks || [];
            const complaints = archivedVault.complaints || [];

            if (feedbacks.length === 0 && complaints.length === 0) {
                showToast('No archived records in vault to export.', 'info');
                return;
            }

            openExportFormatChooser(feedbacks, complaints, 'All Archived Vault Records', 'BISU_All_Archived_Vault');
        }
    };

    function exportToDOCX() {
        const feedbacks = lastFilteredFeedbacks || [];
        const complaints = lastFilteredComplaints || [];
        if (feedbacks.length === 0 && complaints.length === 0) {
            showToast('No filtered data available to export.', 'error');
            return;
        }
        const isOffice = currentUserRole === 'office' && !!currentOfficeScope;
        const reportTitle = isOffice 
            ? `${currentOfficeScope.toUpperCase()} CUSTOMER SATISFACTION & COMPLAINT REPORT`
            : 'Customer Satisfaction & Complaint Feedback Report';
        const filePrefix = isOffice 
            ? `BISU_${currentOfficeScope.replace(/[^a-zA-Z0-9]/g, '_')}_Feedback_Report`
            : 'BISU_Feedback_Report';

        generateDOCXForDataset(feedbacks, complaints, reportTitle, filePrefix);
    }

    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportToPDF);
    if (exportDocxBtn) exportDocxBtn.addEventListener('click', exportToDOCX);
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);

    // --- HTML Sanitization Helper ---
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- Archived Vault State & Persistence ---
    let archivedVault = {
        feedbacks: [],
        complaints: [],
        batches: []
    };

    function expandMonthName(str) {
        if (!str || typeof str !== 'string') return str;
        return str
            .replace(/\bAUG\b/g, 'AUGUST')
            .replace(/\bAug\b/g, 'August')
            .replace(/\bJAN\b/g, 'JANUARY')
            .replace(/\bJan\b/g, 'January')
            .replace(/\bFEB\b/g, 'FEBRUARY')
            .replace(/\bFeb\b/g, 'February')
            .replace(/\bMAR\b/g, 'MARCH')
            .replace(/\bMar\b/g, 'March')
            .replace(/\bAPR\b/g, 'APRIL')
            .replace(/\bApr\b/g, 'April')
            .replace(/\bJUN\b/g, 'JUNE')
            .replace(/\bJun\b/g, 'June')
            .replace(/\bJUL\b/g, 'JULY')
            .replace(/\bJul\b/g, 'July')
            .replace(/\bSEP\b/g, 'SEPTEMBER')
            .replace(/\bSep\b/g, 'September')
            .replace(/\bOCT\b/g, 'OCTOBER')
            .replace(/\bOct\b/g, 'October')
            .replace(/\bNOV\b/g, 'NOVEMBER')
            .replace(/\bNov\b/g, 'November')
            .replace(/\bDEC\b/g, 'DECEMBER')
            .replace(/\bDec\b/g, 'December');
    }

    async function loadArchivedVault() {
        let loadedFromSupabase = false;
        // 1. Try loading from Supabase admin_settings table under id 'archived_vault'
        try {
            const client = await getSupabaseClient();
            if (client) {
                const { data } = await client
                    .from('admin_settings')
                    .select('config')
                    .eq('id', 'archived_vault')
                    .maybeSingle();
                if (data && data.config) {
                    archivedVault = {
                        feedbacks: data.config.feedbacks || [],
                        complaints: data.config.complaints || [],
                        batches: data.config.batches || []
                    };
                    loadedFromSupabase = true;
                }
            }
        } catch (e) {
            console.warn('Could not load archived vault from Supabase:', e);
        }

        // 2. Fallback to localStorage ONLY if Supabase could not be reached/loaded
        if (!loadedFromSupabase) {
            try {
                const localData = JSON.parse(localStorage.getItem('archived_vault'));
                if (localData) {
                    archivedVault = {
                        feedbacks: localData.feedbacks || [],
                        complaints: localData.complaints || [],
                        batches: localData.batches || []
                    };
                }
            } catch (e) {
                console.warn('Could not load archived vault from localStorage:', e);
            }
        } else {
            // Keep localStorage in sync with Supabase source of truth
            localStorage.setItem('archived_vault', JSON.stringify(archivedVault));
        }

        // Expand any month abbreviations (e.g. AUG -> AUGUST, Aug -> August) in vault batches and records
        (archivedVault.batches || []).forEach(b => {
            if (b.scope) b.scope = expandMonthName(b.scope);
            if (b.name) b.name = expandMonthName(b.name);
        });
        (archivedVault.feedbacks || []).forEach(f => {
            if (f.scope) f.scope = expandMonthName(f.scope);
        });
        (archivedVault.complaints || []).forEach(c => {
            if (c.scope) c.scope = expandMonthName(c.scope);
        });

        if (!localStorage.getItem('archived_55_purged')) {
            localStorage.setItem('archived_55_purged', 'true');
        }

        updateArchivedBadges();
    }

    async function saveArchivedVault() {
        localStorage.setItem('archived_vault', JSON.stringify(archivedVault));
        try {
            const client = await getSupabaseClient();
            if (client) {
                await client.from('admin_settings').upsert({
                    id: 'archived_vault',
                    config: archivedVault,
                    updated_at: new Date().toISOString()
                });
            }
        } catch (e) {
            console.warn('Could not save archived vault to Supabase:', e);
        }
        updateArchivedBadges();
    }

    function updateArchivedBadges() {
        const totalCount = (archivedVault.feedbacks?.length || 0) + (archivedVault.complaints?.length || 0);
        const badge = document.getElementById('archived-count-badge');
        if (badge) badge.textContent = totalCount;

        const fCount = document.getElementById('archived-feedback-count');
        if (fCount) fCount.textContent = archivedVault.feedbacks?.length || 0;

        const cCount = document.getElementById('archived-complaint-count');
        if (cCount) cCount.textContent = archivedVault.complaints?.length || 0;

        const bCount = document.getElementById('archived-batch-count');
        if (bCount) bCount.textContent = archivedVault.batches?.length || 0;

        const summary = document.getElementById('archived-vault-summary');
        if (summary) summary.textContent = `${totalCount} archived record(s) stored in vault across ${archivedVault.batches?.length || 0} batch(es).`;
    }

    async function downloadArchiveSpreadsheet(customFeedbacks, customComplaints, filenamePrefix = 'BISU_Archive') {
        const wb = XLSX.utils.book_new();
        const feedbacks = customFeedbacks || lastFilteredFeedbacks || [];
        const complaints = customComplaints || lastFilteredComplaints || [];

        if (feedbacks.length === 0 && complaints.length === 0) {
            throw new Error('No data available to export.');
        }

        const cleanScopeTitle = filenamePrefix.replace(/^BISU_/, '').replace(/_/g, ' ');

        // 1. Executive Summary Sheet
        const summaryWs = buildExecutiveSummarySheet(feedbacks, complaints, cleanScopeTitle);
        XLSX.utils.book_append_sheet(wb, summaryWs, "Executive Summary");

        // 2. Client Feedbacks Sheet
        if (feedbacks.length > 0) {
            const data = feedbacks.map(f => {
                const score = f.mean_score ? parseFloat(f.mean_score) : null;
                return {
                    'Submission Timestamp': f.created_at ? new Date(f.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A',
                    'Date Archived': f.archived_at ? new Date(f.archived_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A',
                    'Office Visited': f.office_visited || 'N/A',
                    'Service Availed': f.service_availed || 'N/A',
                    'Client Category': f.client_type || 'N/A',
                    'Sex / Gender': f.sex || 'N/A',
                    'Region of Residence': f.region_of_residence || (f.ratings && f.ratings.region_of_residence) || 'N/A',
                    'Served By': f.served_by || (f.ratings && f.ratings.served_by) || 'N/A',
                    'Mean Rating Score': score ? score.toFixed(2) : 'N/A',
                    'Rating Assessment': score ? getDesc(score) : 'N/A',
                    'CC1 (Awareness)': f.cc1 ?? 'N/A',
                    'CC2 (Visibility)': f.cc2 ?? 'N/A',
                    'CC3 (Helpfulness)': f.cc3 ?? 'N/A',
                    'Client Commendations': f.commendations || 'None',
                    'Suggestions / Feedback': f.suggestions || 'None',
                    'Feedback Category': f.type || 'Feedback'
                };
            });
            const ws = buildFormattedExcelSheet(data, "ARCHIVED CLIENT FEEDBACKS", `Archive Scope: ${cleanScopeTitle} | Total Records: ${feedbacks.length}`);
            XLSX.utils.book_append_sheet(wb, ws, "Client Feedbacks");
        }

        // 3. Formal Complaints Sheet
        if (complaints.length > 0) {
            const compData = complaints.map(c => ({
                'Date Filed': c.created_at ? new Date(c.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A',
                'Date Archived': c.archived_at ? new Date(c.archived_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A',
                'Complainant Name': c.name || 'Anonymous',
                'Contact Details': c.contact_details || 'N/A',
                'Incident Location': c.place_of_incident || 'Unspecified',
                'Incident Date': c.date_of_incident || 'Unspecified',
                'Subject / Act Complained Of': c.details_of_complaint || 'N/A',
                'Detailed Narrative': c.narrative_report || 'N/A',
                'Expected Resolution': c.desired_outcome || 'N/A'
            }));
            const wsComp = buildFormattedExcelSheet(compData, "ARCHIVED FORMAL COMPLAINTS", `Archive Scope: ${cleanScopeTitle} | Total Complaints: ${complaints.length}`);
            XLSX.utils.book_append_sheet(wb, wsComp, "Formal Complaints");
        }

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const dataUri = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + wbout;
        const dateStr = new Date().toISOString().split('T')[0];
        triggerDownload(dataUri, `${filenamePrefix}_${dateStr}.xlsx`);
        return { feedbackCount: feedbacks.length, complaintCount: complaints.length };
    }

    async function archiveSystemData() {
        const monthSelect = document.getElementById('filter-month-select');
        const yearSelect = document.getElementById('filter-year-select');
        const isFiltered = (monthSelect && monthSelect.value !== 'all') || (yearSelect && yearSelect.value !== 'all');

        const feedbacksToArchive = lastFilteredFeedbacks || [];
        const complaintsToArchive = lastFilteredComplaints || [];
        const hasData = feedbacksToArchive.length > 0 || complaintsToArchive.length > 0;

        if (!hasData) {
            showToast('No records available to archive under the current filters.', 'info');
            return;
        }

        let archiveScopeText = "all feedbacks and complaints";
        let cleanScopeText = "All Feedbacks and Complaints";
        if (isFiltered) {
            const selectedMonthName = monthSelect && monthSelect.value !== 'all' ? monthSelect.options[monthSelect.selectedIndex].text : '';
            const selectedYearVal = yearSelect && yearSelect.value !== 'all' ? yearSelect.value : '';
            
            let filterDesc = [];
            if (selectedMonthName) filterDesc.push(selectedMonthName);
            if (selectedYearVal) filterDesc.push(selectedYearVal);
            
            archiveScopeText = `<strong>only the filtered feedbacks and complaints (${filterDesc.join(' ')})</strong>`;
            cleanScopeText = `Filtered Data (${filterDesc.join(' ')})`;
        }

        const defaultName = isFiltered 
            ? `Archive - ${cleanScopeText}`
            : `Archive - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

        const { value: archiveFormValues } = await Swal.fire({
            title: isFiltered ? 'Archive Filtered Data' : 'Archive Current Data',
            html: `
                <div class="text-left space-y-3.5 text-xs text-slate-600 mt-2">
                    <p class="leading-relaxed">This action will move <strong>${archiveScopeText}</strong> into the Archived Vault, generate an Excel spreadsheet backup, and clear them from live logs.</p>
                    
                    <div>
                        <label class="block font-extrabold text-slate-800 mb-1">Archive Name / Label:</label>
                        <input id="swal-archive-name" type="text" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-bisu-blue focus:outline-none" value="${escapeHtml(defaultName)}" placeholder="e.g., Q3 2026 Office Feedback">
                    </div>

                    <div>
                        <label class="block font-extrabold text-slate-800 mb-1">Type <strong class="text-bisu-blue">ARCHIVE</strong> to confirm:</label>
                        <input id="swal-archive-confirm" type="text" class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-bisu-blue focus:outline-none" placeholder="ARCHIVE">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-box-archive mr-1.5"></i> Archive Data',
            confirmButtonColor: '#22007c',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-3xl shadow-2xl border-t-8 border-bisu-blue',
                title: 'text-xl font-black text-slate-800'
            },
            preConfirm: () => {
                const customName = document.getElementById('swal-archive-name')?.value?.trim();
                const confirmVal = document.getElementById('swal-archive-confirm')?.value?.trim();
                if (!customName) {
                    Swal.showValidationMessage('Please enter a name for this archive');
                    return false;
                }
                if (confirmVal !== 'ARCHIVE') {
                    Swal.showValidationMessage('You must type ARCHIVE exactly to proceed');
                    return false;
                }
                return { customName };
            }
        });

        if (!archiveFormValues) return;
        const finalArchiveName = archiveFormValues.customName;

        Swal.fire({
            title: 'Archiving Data...',
            html: `Saving records under <strong>"${escapeHtml(finalArchiveName)}"</strong> & downloading spreadsheet...`,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'rounded-3xl' }
        });

        try {
            // Download backup
            const summary = await downloadArchiveSpreadsheet(feedbacksToArchive, complaintsToArchive, finalArchiveName.replace(/[^a-zA-Z0-0_-]/g, '_'));

            // Store in vault
            const batchId = 'batch_' + Date.now();
            const nowIso = new Date().toISOString();

            const taggedFeedbacks = feedbacksToArchive.map(f => ({ ...f, archived_at: nowIso, batch_id: batchId, scope: finalArchiveName }));
            const taggedComplaints = complaintsToArchive.map(c => ({ ...c, archived_at: nowIso, batch_id: batchId, scope: finalArchiveName }));

            const newBatch = {
                id: batchId,
                timestamp: nowIso,
                scope: finalArchiveName,
                name: finalArchiveName,
                feedbackCount: feedbacksToArchive.length,
                complaintCount: complaintsToArchive.length,
                feedbacks: taggedFeedbacks,
                complaints: taggedComplaints
            };

            archivedVault.feedbacks = [...taggedFeedbacks, ...(archivedVault.feedbacks || [])];
            archivedVault.complaints = [...taggedComplaints, ...(archivedVault.complaints || [])];
            archivedVault.batches = [newBatch, ...(archivedVault.batches || [])];

            await saveArchivedVault();

            // Clear from live database
            const client = await getSupabaseClient();
            if (client) {
                const feedbackIds = feedbacksToArchive.map(f => f.id).filter(Boolean);
                const complaintIds = complaintsToArchive.map(c => c.id).filter(Boolean);

                if (feedbackIds.length > 0) {
                    const { error: fDelErr } = await client.from('feedbacks').delete().in('id', feedbackIds);
                    if (fDelErr) console.warn('Supabase feedback delete warning:', fDelErr);
                }
                if (complaintIds.length > 0) {
                    const { error: cDelErr } = await client.from('complaints').delete().in('id', complaintIds);
                    if (cDelErr) console.warn('Supabase complaint delete warning:', cDelErr);
                }
            }

            // Clear offline queue matching archived records
            let localF = JSON.parse(localStorage.getItem('pendingFeedbacks')) || [];
            let localC = JSON.parse(localStorage.getItem('pendingComplaints')) || [];
            const archivedFIds = new Set(feedbacksToArchive.map(f => f.id));
            const archivedCIds = new Set(complaintsToArchive.map(c => c.id));
            localF = localF.filter(f => !archivedFIds.has(f.id));
            localC = localC.filter(c => !archivedCIds.has(c.id));
            localStorage.setItem('pendingFeedbacks', JSON.stringify(localF));
            localStorage.setItem('pendingComplaints', JSON.stringify(localC));

            await fetchAdminData();

            Swal.fire({
                title: 'Archive Complete',
                html: `Saved <strong>${summary.feedbackCount}</strong> feedback(s) and <strong>${summary.complaintCount}</strong> complaint(s) into the <strong>Archived Vault</strong>.<br><br>Spreadsheet backup downloaded! You can view or restore these archived records anytime in the Archived Vault.`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-vault mr-1"></i> Open Archived Vault',
                cancelButtonText: 'Done',
                confirmButtonColor: '#22007c',
                customClass: { popup: 'rounded-3xl' }
            }).then((res) => {
                if (res.isConfirmed) {
                    openArchivedVaultModal();
                }
            });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', err.message || 'An error occurred while archiving data.', 'error');
        }
    }

    if (archiveDataBtn) archiveDataBtn.addEventListener('click', archiveSystemData);

    // --- Archived Vault Modal UI Controller ---
    let activeArchiveTab = 'feedbacks';

    const viewArchivedBtn = document.getElementById('view-archived-btn');
    const viewArchivedModal = document.getElementById('view-archived-modal');
    const closeArchivedBtn = document.getElementById('close-archived-btn');
    const archivedSearchInput = document.getElementById('archived-search-input');
    const exportAllArchivesBtn = document.getElementById('export-all-archives-btn');
    const clearAllArchivesBtn = document.getElementById('clear-all-archives-btn');

    const archiveTabFeedbacks = document.getElementById('archive-tab-feedbacks');
    const archiveTabComplaints = document.getElementById('archive-tab-complaints');
    const archiveTabBatches = document.getElementById('archive-tab-batches');

    function openArchivedVaultModal() {
        if (!viewArchivedModal) return;
        viewArchivedModal.classList.remove('hidden');
        viewArchivedModal.classList.add('flex');
        loadArchivedVault().then(() => {
            renderArchivedVaultView();
        });
    }

    function closeArchivedVaultModal() {
        if (!viewArchivedModal) return;
        viewArchivedModal.classList.add('hidden');
        viewArchivedModal.classList.remove('flex');
    }

    function switchArchiveTab(tab) {
        activeArchiveTab = tab;
        [archiveTabFeedbacks, archiveTabComplaints, archiveTabBatches].forEach(btn => {
            if (!btn) return;
            btn.classList.remove('border-bisu-blue', 'text-bisu-blue');
            btn.classList.add('border-transparent', 'text-slate-500');
        });

        const activeBtn = tab === 'feedbacks' ? archiveTabFeedbacks : (tab === 'complaints' ? archiveTabComplaints : archiveTabBatches);
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-slate-500');
            activeBtn.classList.add('border-bisu-blue', 'text-bisu-blue');
        }

        document.getElementById('archived-feedbacks-container')?.classList.toggle('hidden', tab !== 'feedbacks');
        document.getElementById('archived-complaints-container')?.classList.toggle('hidden', tab !== 'complaints');
        document.getElementById('archived-batches-container')?.classList.toggle('hidden', tab !== 'batches');

        renderArchivedVaultView();
    }

    function updateArchivedMonthFilterOptions() {
        const monthSelect = document.getElementById('archived-month-filter');
        if (!monthSelect) return;

        const currentVal = monthSelect.value || 'ALL';
        const batchMap = new Map();

        (archivedVault.batches || []).forEach(b => {
            const name = b.scope || b.name || 'Archive Batch';
            const count = (b.feedbacks?.length || b.feedbackCount || 0) + (b.complaints?.length || b.complaintCount || 0);
            batchMap.set(b.id, { name, count });
        });

        // Collect any items with batch_id not explicitly in batches array
        const allItems = [...(archivedVault.feedbacks || []), ...(archivedVault.complaints || [])];
        allItems.forEach(item => {
            const bId = item.batch_id || item.id;
            if (bId && !batchMap.has(bId)) {
                const name = item.scope || 'Legacy Archive Batch';
                batchMap.set(bId, { name, count: 1 });
            }
        });

        let html = '<option value="ALL">All Archives</option>';
        batchMap.forEach((info, bId) => {
            html += `<option value="${escapeHtml(bId)}">${escapeHtml(info.name)} (${info.count} records)</option>`;
        });

        monthSelect.innerHTML = html;
        if (currentVal === 'ALL' || batchMap.has(currentVal)) {
            monthSelect.value = currentVal;
        } else {
            monthSelect.value = 'ALL';
        }
    }

    function groupItemsByArchivedTime(list) {
        const groups = new Map();

        list.forEach(item => {
            const batchId = item.batch_id || item.id || ('batch_' + (item.archived_at || item.timestamp || item.created_at || 'legacy'));
            const dateVal = item.archived_at || item.timestamp || item.created_at || Date.now();
            const d = new Date(dateVal);

            let dateFormatted = 'Unknown Archive Time';
            if (!isNaN(d.getTime())) {
                dateFormatted = d.toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }

            const matchingBatch = (archivedVault.batches || []).find(b => b.id === batchId || b.id === item.batch_id);
            let rawLabel = matchingBatch?.scope || matchingBatch?.name || item.scope || `Archived on ${dateFormatted}`;
            let label = expandMonthName(rawLabel);

            const groupKey = matchingBatch?.id || item.batch_id || dateFormatted;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    batchId: groupKey,
                    label: label,
                    timestamp: dateVal,
                    items: []
                });
            }
            groups.get(groupKey).items.push(item);
        });

        const sortedGroups = Array.from(groups.values()).sort((a, b) => {
            const da = new Date(a.timestamp).getTime() || 0;
            const db = new Date(b.timestamp).getTime() || 0;
            return db - da;
        });

        return sortedGroups;
    }

    function renderArchivedVaultView() {
        updateArchivedBadges();
        updateArchivedMonthFilterOptions();

        const searchVal = (archivedSearchInput?.value || '').toLowerCase().trim();
        const monthFilterSelect = document.getElementById('archived-month-filter');
        const monthFilter = monthFilterSelect?.value || 'ALL';

        // Update KPI Stats Cards
        const feedbacks = archivedVault.feedbacks || [];
        const complaints = archivedVault.complaints || [];

        const kpiFeedbacksEl = document.getElementById('kpi-archived-feedbacks');
        const kpiScoreEl = document.getElementById('kpi-archived-score');
        const kpiComplaintsEl = document.getElementById('kpi-archived-complaints');
        const kpiMonthEl = document.getElementById('kpi-archived-month');

        if (kpiFeedbacksEl) kpiFeedbacksEl.textContent = feedbacks.length;
        if (kpiComplaintsEl) kpiComplaintsEl.textContent = complaints.length;

        if (kpiScoreEl) {
            if (feedbacks.length > 0) {
                const totalScore = feedbacks.reduce((acc, curr) => acc + (parseFloat(curr.mean_score) || 0), 0);
                const avgScore = (totalScore / feedbacks.length).toFixed(2);
                kpiScoreEl.textContent = `${avgScore} / 5`;
            } else {
                kpiScoreEl.textContent = '0.00 / 5';
            }
        }

        if (kpiMonthEl) {
            if (monthFilter === 'ALL') {
                kpiMonthEl.textContent = 'All Archives';
            } else {
                const opt = monthFilterSelect?.options[monthFilterSelect.selectedIndex];
                kpiMonthEl.textContent = opt ? opt.text : monthFilter;
            }
        }

        if (activeArchiveTab === 'feedbacks') {
            renderArchivedFeedbacks(searchVal, monthFilter);
        } else if (activeArchiveTab === 'complaints') {
            renderArchivedComplaints(searchVal, monthFilter);
        } else {
            renderArchivedBatches(searchVal, monthFilter);
        }
    }

    function renderArchivedFeedbacks(searchVal, monthFilter = 'ALL') {
        const container = document.getElementById('archived-feedbacks-container');
        if (!container) return;

        let list = archivedVault.feedbacks || [];
        if (searchVal) {
            list = list.filter(f => 
                (f.office_visited || '').toLowerCase().includes(searchVal) ||
                (f.service_availed || '').toLowerCase().includes(searchVal) ||
                (f.client_type || '').toLowerCase().includes(searchVal) ||
                (f.commendations || '').toLowerCase().includes(searchVal) ||
                (f.suggestions || '').toLowerCase().includes(searchVal) ||
                (f.id || '').toLowerCase().includes(searchVal)
            );
        }

        if (monthFilter && monthFilter !== 'ALL') {
            list = list.filter(f => {
                const itemBatchId = f.batch_id || f.id;
                const matchingBatch = (archivedVault.batches || []).find(b => b.id === itemBatchId || b.id === f.batch_id);
                const groupKey = matchingBatch?.id || f.batch_id;
                return groupKey === monthFilter || itemBatchId === monthFilter;
            });
        }

        if (list.length === 0) {
            container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic shadow-2xs">No archived feedbacks stored ${searchVal || monthFilter !== 'ALL' ? 'matching selected filter' : ''}.</div>`;
            return;
        }

        const groups = groupItemsByArchivedTime(list);

        container.innerHTML = groups.map(group => {
            const monthTableRowsHtml = group.items.map(item => {
                const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
                const rawScore = item.mean_score ? parseFloat(item.mean_score) : 0;
                const score = rawScore > 0 ? rawScore.toFixed(2) : 'N/A';

                let scoreBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                if (rawScore >= 4.0) {
                    scoreBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                } else if (rawScore >= 3.0) {
                    scoreBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                } else if (rawScore > 0) {
                    scoreBadgeClass = 'bg-red-50 text-red-700 border-red-200';
                }

                return `
                    <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-b-0">
                        <td class="px-3.5 py-3 align-top">
                            <div class="font-extrabold text-xs text-bisu-blue flex items-center gap-1.5 mb-0.5">
                                <i class="fa-solid fa-building text-[11px] shrink-0"></i>
                                <span>${escapeHtml(item.office_visited || 'General Office')}</span>
                            </div>
                            <div class="text-[11px] text-slate-500 font-medium">
                                ${escapeHtml(item.service_availed || 'N/A')}
                            </div>
                        </td>
                        <td class="px-3 py-3 align-top text-center whitespace-nowrap">
                            <span class="inline-block bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                                ${escapeHtml(item.client_type || 'Client')}
                            </span>
                        </td>
                        <td class="px-3 py-3 align-top text-center whitespace-nowrap">
                            <span class="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-extrabold whitespace-nowrap ${scoreBadgeClass} shadow-2xs">
                                <i class="fa-solid fa-star text-[10px] shrink-0"></i>
                                <span>${score}</span>
                                <span class="text-[10px] font-normal opacity-70 ml-0.5">/ 5</span>
                            </span>
                        </td>
                        <td class="px-3.5 py-3 align-top max-w-xs md:max-w-sm">
                            ${item.suggestions ? `
                                <p class="text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded-xl border border-slate-200/60 leading-relaxed italic">
                                    "${escapeHtml(item.suggestions)}"
                                </p>
                            ` : '<span class="text-slate-400 italic text-xs">No feedback comments provided</span>'}
                            ${item.commendations ? `
                                <p class="text-[11px] text-emerald-700 font-medium mt-1 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                                    <strong class="font-bold">Commendation:</strong> ${escapeHtml(item.commendations)}
                                </p>
                            ` : ''}
                        </td>
                        <td class="px-3 py-3 align-top text-xs text-slate-500 font-medium whitespace-nowrap text-center">
                            ${dateStr}
                        </td>
                        <td class="px-3.5 py-3 align-top text-center whitespace-nowrap">
                            <button onclick="restoreArchivedRecord('${item.id}', 'feedback')" title="Restore to live database" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition border border-emerald-200 cursor-pointer shadow-2xs inline-flex items-center gap-1">
                                <i class="fa-solid fa-rotate-left text-[11px]"></i>
                                <span>Restore</span>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden mb-5">
                    <!-- Archive Batch Header Bar -->
                    <div class="bg-bisu-blue text-white px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-bisu-blue-dark shadow-xs">
                        <div class="flex items-center space-x-2.5">
                            <i class="fa-solid fa-box-archive text-bisu-gold text-sm"></i>
                            <h3 class="font-extrabold text-xs sm:text-sm text-white tracking-tight">${escapeHtml(group.label)}</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-bisu-blue-dark text-bisu-gold border border-bisu-gold/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                ${group.items.length} ${group.items.length === 1 ? 'Record' : 'Records'}
                            </span>
                            <button onclick="restoreArchivedBatch('${group.batchId}')" title="Restore this entire archive batch back to live dashboard" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs">
                                <i class="fa-solid fa-rotate-left text-[10px]"></i>
                                <span>Restore Batch</span>
                            </button>
                            <button onclick="renameArchivedBatch('${group.batchId}')" title="Rename this archive batch" class="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs border border-white/20">
                                <i class="fa-solid fa-pen-to-square text-[10px]"></i>
                                <span>Rename</span>
                            </button>
                            <button onclick="openMergeArchivedModal('${group.batchId}')" title="Merge this archive batch with another" class="px-2.5 py-1 bg-bisu-gold hover:bg-bisu-gold-dark text-slate-950 text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs">
                                <i class="fa-solid fa-code-merge text-[10px]"></i>
                                <span>Merge</span>
                            </button>
                            <button onclick="openExportFormatChooserForBatch('${group.batchId}')" title="Export this archive batch" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer shadow-2xs">
                                <i class="fa-solid fa-file-export text-[10px]"></i>
                                <span>Export</span>
                                <i class="fa-solid fa-chevron-down text-[9px] opacity-80"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="overflow-x-auto custom-scrollbar w-full">
                        <table class="w-full min-w-[680px] text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                    <th class="px-3.5 py-2.5 whitespace-nowrap">Office & Service</th>
                                    <th class="px-3 py-2.5 text-center whitespace-nowrap">Client Type</th>
                                    <th class="px-3 py-2.5 text-center whitespace-nowrap">Rating Score</th>
                                    <th class="px-3.5 py-2.5 whitespace-nowrap">Feedback / Comments</th>
                                    <th class="px-3 py-2.5 text-center whitespace-nowrap">Submitted Date</th>
                                    <th class="px-3.5 py-2.5 text-center whitespace-nowrap min-w-[100px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthTableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderArchivedComplaints(searchVal, monthFilter = 'ALL') {
        const container = document.getElementById('archived-complaints-container');
        if (!container) return;

        let list = archivedVault.complaints || [];
        if (searchVal) {
            list = list.filter(c => 
                (c.name || '').toLowerCase().includes(searchVal) ||
                (c.place_of_incident || '').toLowerCase().includes(searchVal) ||
                (c.details_of_complaint || '').toLowerCase().includes(searchVal) ||
                (c.narrative_report || '').toLowerCase().includes(searchVal) ||
                (c.id || '').toLowerCase().includes(searchVal)
            );
        }

        if (monthFilter && monthFilter !== 'ALL') {
            list = list.filter(c => {
                const itemBatchId = c.batch_id || c.id;
                const matchingBatch = (archivedVault.batches || []).find(b => b.id === itemBatchId || b.id === c.batch_id);
                const groupKey = matchingBatch?.id || c.batch_id;
                return groupKey === monthFilter || itemBatchId === monthFilter;
            });
        }

        if (list.length === 0) {
            container.innerHTML = `<div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic shadow-2xs">No archived complaints stored ${searchVal || monthFilter !== 'ALL' ? 'for selected filters' : ''}.</div>`;
            return;
        }

        const groups = groupItemsByArchivedTime(list);

        container.innerHTML = groups.map(group => {
            const monthTableRowsHtml = group.items.map(item => {
                const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date';
                const name = item.name || 'Anonymous Complainant';

                return `
                    <tr class="hover:bg-red-50/30 transition-colors border-b border-slate-100 last:border-b-0">
                        <td class="px-4 py-3.5 align-top">
                            <span class="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-100 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                                <i class="fa-solid fa-user-shield text-[10px]"></i>
                                <span>${escapeHtml(name)}</span>
                            </span>
                        </td>
                        <td class="px-4 py-3.5 align-top text-center">
                            <span class="inline-block bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                                ${escapeHtml(item.place_of_incident || 'N/A')}
                            </span>
                        </td>
                        <td class="px-4 py-3.5 align-top max-w-lg">
                            <p class="text-xs text-slate-700 font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                                ${escapeHtml(item.details_of_complaint || item.narrative_report || 'No narrative provided.')}
                            </p>
                        </td>
                        <td class="px-4 py-3.5 align-top text-xs text-slate-500 font-medium whitespace-nowrap text-center">
                            ${dateStr}
                        </td>
                        <td class="px-4 py-3.5 align-top text-center whitespace-nowrap">
                            <button onclick="restoreArchivedRecord('${item.id}', 'complaint')" title="Restore to live database" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition border border-emerald-200 cursor-pointer">
                                <i class="fa-solid fa-rotate-left mr-1"></i> Restore
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="bg-white border border-red-100 rounded-2xl shadow-2xs overflow-hidden mb-6">
                    <!-- Archive Batch Header Bar -->
                    <div class="bg-bisu-blue text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-bisu-blue-dark shadow-xs">
                        <div class="flex items-center space-x-2.5">
                            <i class="fa-solid fa-box-archive text-bisu-gold text-sm"></i>
                            <h3 class="font-extrabold text-sm text-white tracking-tight">${escapeHtml(group.label)}</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="bg-bisu-blue-dark text-bisu-gold border border-bisu-gold/40 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                ${group.items.length} ${group.items.length === 1 ? 'Complaint' : 'Complaints'}
                            </span>
                            <button onclick="restoreArchivedBatch('${group.batchId}')" title="Restore this entire archive batch back to live dashboard" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
                                <i class="fa-solid fa-rotate-left text-[10px]"></i>
                                <span>Restore Batch</span>
                            </button>
                            <button onclick="renameArchivedBatch('${group.batchId}')" title="Rename this archive batch" class="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs border border-white/20">
                                <i class="fa-solid fa-pen-to-square text-[10px]"></i>
                                <span>Rename</span>
                            </button>
                            <button onclick="openMergeArchivedModal('${group.batchId}')" title="Merge this archive batch with another" class="px-3 py-1 bg-bisu-gold hover:bg-bisu-gold-dark text-slate-950 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
                                <i class="fa-solid fa-code-merge text-[10px]"></i>
                                <span>Merge Batch</span>
                            </button>
                            <button onclick="openExportFormatChooserForBatch('${group.batchId}')" title="Export this archive batch" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs">
                                <i class="fa-solid fa-file-export text-[10px]"></i>
                                <span>Export</span>
                                <i class="fa-solid fa-chevron-down text-[9px] opacity-80"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                    <th class="px-4 py-2.5">Complainant</th>
                                    <th class="px-4 py-2.5 text-center">Incident Location</th>
                                    <th class="px-4 py-2.5">Complaint Narrative / Details</th>
                                    <th class="px-4 py-2.5 text-center">Filing Date</th>
                                    <th class="px-4 py-2.5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${monthTableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderArchivedBatches(searchVal, monthFilter = 'ALL') {
        const container = document.getElementById('archived-batches-container');
        if (!container) return;

        let list = archivedVault.batches || [];
        if (searchVal) {
            list = list.filter(b => 
                (b.scope || '').toLowerCase().includes(searchVal) ||
                (b.name || '').toLowerCase().includes(searchVal) ||
                (b.timestamp || '').toLowerCase().includes(searchVal) ||
                (b.id || '').toLowerCase().includes(searchVal)
            );
        }

        if (monthFilter && monthFilter !== 'ALL') {
            list = list.filter(b => b.id === monthFilter);
        }

        if (list.length === 0) {
            container.innerHTML = `<div class="text-center py-12 text-slate-400 italic">No archive history ${searchVal || monthFilter !== 'ALL' ? 'matching selected filter' : 'recorded'}.</div>`;
            return;
        }

        const groups = groupItemsByArchivedTime(list);

        container.innerHTML = groups.map(group => {
            const batchCardsHtml = group.items.map(b => {
                const dateStr = b.timestamp ? new Date(b.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';

                return `
                    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="space-y-1.5">
                            <div class="flex items-center gap-2 flex-wrap">
                                <i class="fa-solid fa-box-archive text-amber-500 text-base"></i>
                                <h4 class="font-black text-sm text-slate-800">${escapeHtml(b.scope || b.name || 'Archive Batch')}</h4>
                                <span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                                    <i class="fa-solid fa-clock text-amber-600 text-[10px]"></i>
                                    <span>Archived on ${dateStr}</span>
                                </span>
                            </div>
                            <p class="text-xs text-slate-600 font-medium">
                                Contains <strong>${b.feedbackCount || (b.feedbacks?.length || 0)}</strong> feedback(s) and <strong>${b.complaintCount || (b.complaints?.length || 0)}</strong> complaint(s)
                            </p>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <button onclick="restoreArchivedBatch('${b.id}')" title="Restore this entire archive batch back to live dashboard" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                <i class="fa-solid fa-rotate-left"></i> Restore Batch
                            </button>
                            <button onclick="renameArchivedBatch('${b.id}')" title="Rename this archive batch" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer border border-slate-700">
                                <i class="fa-solid fa-pen-to-square"></i> Rename
                            </button>
                            <button onclick="openMergeArchivedModal('${b.id}')" title="Merge with another archive batch" class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                <i class="fa-solid fa-code-merge"></i> Merge
                            </button>
                            <button onclick="openExportFormatChooserForBatch('${b.id}')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer">
                                <i class="fa-solid fa-file-export"></i> Export
                                <i class="fa-solid fa-chevron-down text-xs opacity-80"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="mb-5 space-y-3">
                    <div class="flex items-center justify-between bg-bisu-blue text-white rounded-xl px-4 py-2.5 shadow-2xs border border-bisu-blue-dark sticky top-0 z-10">
                        <div class="flex items-center gap-2.5">
                            <div class="w-6 h-6 rounded-lg bg-bisu-gold/20 text-bisu-gold border border-bisu-gold/30 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-box-archive"></i>
                            </div>
                            <h3 class="font-extrabold text-xs sm:text-sm text-white tracking-tight">${escapeHtml(group.label)}</h3>
                        </div>
                        <span class="bg-bisu-blue-dark text-bisu-gold border border-bisu-gold/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            ${group.items.length} ${group.items.length === 1 ? 'Batch' : 'Batches'}
                        </span>
                    </div>
                    <div class="space-y-3 pl-1">
                        ${batchCardsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.renameArchivedBatch = async function(batchId) {
        let batch = (archivedVault.batches || []).find(b => b.id === batchId);
        const currentName = batch?.scope || batch?.name || 'Archive Batch';

        const { value: newName } = await Swal.fire({
            title: 'Rename Archive Batch',
            text: 'Enter a new title/label for this archive batch:',
            input: 'text',
            inputValue: currentName,
            showCancelButton: true,
            confirmButtonText: 'Save Title',
            confirmButtonColor: '#22007c',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-2xl font-sans' },
            inputValidator: (val) => {
                if (!val || !val.trim()) return 'Archive title cannot be empty.';
            }
        });

        if (!newName) return;

        const trimmed = newName.trim();
        if (!batch) {
            batch = { id: batchId, timestamp: new Date().toISOString(), scope: trimmed, name: trimmed };
            archivedVault.batches = [batch, ...(archivedVault.batches || [])];
        } else {
            batch.scope = trimmed;
            batch.name = trimmed;
        }

        (archivedVault.feedbacks || []).forEach(f => {
            if (f.batch_id === batchId) f.scope = trimmed;
        });
        (archivedVault.complaints || []).forEach(c => {
            if (c.batch_id === batchId) c.scope = trimmed;
        });

        await saveArchivedVault();
        renderArchivedVaultView();
        showToast('Archive batch renamed successfully', 'success');
    };

    async function openMergeArchivedModal(preselectedBatchId = null) {
        let batches = archivedVault.batches || [];

        // Synthesize batches if empty
        if (batches.length === 0) {
            const batchMap = new Map();
            const allItems = [...(archivedVault.feedbacks || []), ...(archivedVault.complaints || [])];
            allItems.forEach(item => {
                const bId = item.batch_id || ('batch_' + (item.archived_at || 'legacy'));
                if (!batchMap.has(bId)) {
                    batchMap.set(bId, {
                        id: bId,
                        timestamp: item.archived_at || item.created_at || new Date().toISOString(),
                        scope: 'Archive Batch',
                        feedbacks: [],
                        complaints: []
                    });
                }
                if (item.office_visited !== undefined || item.mean_score !== undefined) {
                    batchMap.get(bId).feedbacks.push(item);
                } else {
                    batchMap.get(bId).complaints.push(item);
                }
            });
            batches = Array.from(batchMap.values()).map(b => ({
                ...b,
                feedbackCount: b.feedbacks.length,
                complaintCount: b.complaints.length
            }));
        }

        if (batches.length < 2) {
            Swal.fire({
                title: 'Cannot Merge Archives',
                text: 'You need at least 2 separate archive batches stored in the vault to perform a merge operation.',
                icon: 'info',
                confirmButtonColor: '#22007c',
                customClass: { popup: 'rounded-3xl' }
            });
            return;
        }

        const batchOptionsHtml = batches.map(b => {
            const dStr = b.timestamp ? new Date(b.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
            const isChecked = preselectedBatchId ? (b.id === preselectedBatchId) : true;
            const fCount = b.feedbackCount || (b.feedbacks?.length || 0);
            const cCount = b.complaintCount || (b.complaints?.length || 0);

            return `
                <label class="flex items-start space-x-3 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer transition text-left my-2">
                    <input type="checkbox" name="merge_batch_select" value="${b.id}" ${isChecked ? 'checked' : ''} class="mt-1 w-4 h-4 text-bisu-blue border-slate-300 rounded focus:ring-bisu-blue shrink-0">
                    <div class="flex-grow text-xs">
                        <div class="font-black text-slate-800 text-sm flex items-center justify-between">
                            <span>${escapeHtml(b.scope || 'Archive Batch')}</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">${dStr}</span>
                        </div>
                        <p class="text-slate-500 font-medium mt-1">
                            Contains <strong class="text-slate-700">${fCount}</strong> feedback(s) and <strong class="text-slate-700">${cCount}</strong> complaint(s)
                        </p>
                    </div>
                </label>
            `;
        }).join('');

        const { value: formValues } = await Swal.fire({
            title: '<i class="fa-solid fa-code-merge text-amber-500 mr-2"></i>Merge Archive Batches',
            html: `
                <p class="text-xs text-slate-500 font-medium mb-3 text-left">
                    Select 2 or more archive batches below to combine them into a single consolidated archive group.
                </p>
                <div class="max-h-60 overflow-y-auto custom-scrollbar border border-slate-200 rounded-2xl p-2 bg-white mb-4">
                    ${batchOptionsHtml}
                </div>
                <div class="text-left space-y-1">
                    <label class="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">New Merged Batch Name / Scope:</label>
                    <input id="swal-merge-name" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-bisu-blue" value="Consolidated Archive (Merged ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-code-merge mr-1"></i> Merge Selected Batches',
            confirmButtonColor: '#22007c',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-3xl shadow-2xl max-w-lg',
                title: 'text-xl font-black text-slate-800',
            },
            preConfirm: () => {
                const checkedBoxes = Array.from(document.querySelectorAll('input[name="merge_batch_select"]:checked')).map(cb => cb.value);
                const mergeName = document.getElementById('swal-merge-name')?.value?.trim() || 'Merged Archive Batch';

                if (checkedBoxes.length < 2) {
                    Swal.showValidationMessage('Please select at least 2 archive batches to merge.');
                    return false;
                }
                return { selectedBatchIds: checkedBoxes, mergeName };
            }
        });

        if (!formValues) return;

        try {
            const { selectedBatchIds, mergeName } = formValues;
            const newBatchId = 'batch_merged_' + Date.now();
            const nowIso = new Date().toISOString();

            const selectedBatchSet = new Set(selectedBatchIds);
            const feedbacksToMerge = [];
            const complaintsToMerge = [];

            archivedVault.feedbacks = (archivedVault.feedbacks || []).map(f => {
                const itemBatch = f.batch_id || ('batch_' + (f.archived_at || 'legacy'));
                if (selectedBatchSet.has(itemBatch) || selectedBatchSet.has(f.batch_id)) {
                    const updated = { ...f, batch_id: newBatchId, archived_at: nowIso };
                    feedbacksToMerge.push(updated);
                    return updated;
                }
                return f;
            });

            archivedVault.complaints = (archivedVault.complaints || []).map(c => {
                const itemBatch = c.batch_id || ('batch_' + (c.archived_at || 'legacy'));
                if (selectedBatchSet.has(itemBatch) || selectedBatchSet.has(c.batch_id)) {
                    const updated = { ...c, batch_id: newBatchId, archived_at: nowIso };
                    complaintsToMerge.push(updated);
                    return updated;
                }
                return c;
            });

            const remainingBatches = (archivedVault.batches || []).filter(b => !selectedBatchSet.has(b.id));

            const mergedBatchObj = {
                id: newBatchId,
                timestamp: nowIso,
                scope: mergeName,
                feedbackCount: feedbacksToMerge.length,
                complaintCount: complaintsToMerge.length,
                feedbacks: feedbacksToMerge,
                complaints: complaintsToMerge
            };

            archivedVault.batches = [mergedBatchObj, ...remainingBatches];

            await saveArchivedVault();
            renderArchivedVaultView();

            Swal.fire({
                title: 'Batches Merged!',
                html: `Successfully combined <strong>${selectedBatchIds.length} archive batches</strong> containing <strong>${feedbacksToMerge.length} feedback(s)</strong> and <strong>${complaintsToMerge.length} complaint(s)</strong> under <strong>"${escapeHtml(mergeName)}"</strong>.`,
                icon: 'success',
                confirmButtonColor: '#22007c',
                customClass: { popup: 'rounded-3xl' }
            });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to merge archive batches: ' + err.message, 'error');
        }
    }

    window.openMergeArchivedModal = openMergeArchivedModal;

    // Global Window Actions for Vault
    window.restoreArchivedRecord = async function(id, type = 'feedback') {
        const item = type === 'feedback' 
            ? archivedVault.feedbacks.find(f => f.id === id)
            : archivedVault.complaints.find(c => c.id === id);

        if (!item) {
            showToast('Item not found in vault.', 'error');
            return;
        }

        const res = await Swal.fire({
            title: 'Restore to Live Dashboard?',
            text: `This will move this ${type} back into active live dashboard statistics.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Restore Record',
            confirmButtonColor: '#059669',
            customClass: { popup: 'rounded-2xl' }
        });

        if (!res.isConfirmed) return;

        try {
            const cleanItem = { ...item };
            delete cleanItem.archived_at;
            delete cleanItem.batch_id;
            delete cleanItem.scope;

            const client = await getSupabaseClient();
            if (client) {
                const table = type === 'feedback' ? 'feedbacks' : 'complaints';
                const payloadToUpsert = type === 'feedback' ? prepareFeedbackPayload(cleanItem) : cleanItem;
                const { error } = await client.from(table).upsert(payloadToUpsert);
                if (error) console.warn('Supabase restore upsert warning:', error);
            } else {
                const storageKey = type === 'feedback' ? 'pendingFeedbacks' : 'pendingComplaints';
                saveOffline(storageKey, cleanItem);
            }

            if (type === 'feedback') {
                archivedVault.feedbacks = archivedVault.feedbacks.filter(f => f.id !== id);
            } else {
                archivedVault.complaints = archivedVault.complaints.filter(c => c.id !== id);
            }

            await saveArchivedVault();
            await fetchAdminData();
            renderArchivedVaultView();

            showToast(`Restored ${type} to live dashboard!`, 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to restore record: ' + (err.message || err), 'error');
        }
    };

    window.restoreArchivedBatch = async function(batchId) {
        const b = (archivedVault.batches || []).find(batch => batch.id === batchId);
        let batchFeedbacks = (archivedVault.feedbacks || []).filter(f => f.batch_id === batchId);
        let batchComplaints = (archivedVault.complaints || []).filter(c => c.batch_id === batchId);

        if (batchFeedbacks.length === 0 && b && Array.isArray(b.feedbacks)) {
            batchFeedbacks = b.feedbacks;
        }
        if (batchComplaints.length === 0 && b && Array.isArray(b.complaints)) {
            batchComplaints = b.complaints;
        }

        const totalToRestore = batchFeedbacks.length + batchComplaints.length;
        if (totalToRestore === 0) {
            showToast('No archived records found in this batch to restore.', 'info');
            return;
        }

        const batchName = b?.scope || b?.name || 'Archive Batch';

        const res = await Swal.fire({
            title: `Restore Batch to Live Dashboard?`,
            html: `This will restore all <strong>${totalToRestore} record(s)</strong> (${batchFeedbacks.length} feedback(s), ${batchComplaints.length} complaint(s)) from <strong>"${escapeHtml(batchName)}"</strong> back to the live dashboard.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-rotate-left mr-1"></i> Restore Entire Batch',
            confirmButtonColor: '#059669',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-xl' }
        });

        if (!res.isConfirmed) return;

        try {
            Swal.fire({
                title: 'Restoring Batch Records...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-2xl' }
            });

            const client = await getSupabaseClient();

            const cleanFeedbacks = batchFeedbacks.map(f => {
                const item = { ...f };
                delete item.archived_at;
                delete item.batch_id;
                delete item.scope;
                return item;
            });

            const cleanComplaints = batchComplaints.map(c => {
                const item = { ...c };
                delete item.archived_at;
                delete item.batch_id;
                delete item.scope;
                return item;
            });

            if (client) {
                if (cleanFeedbacks.length > 0) {
                    const preparedFeedbacks = cleanFeedbacks.map(f => prepareFeedbackPayload(f));
                    const { error } = await client.from('feedbacks').upsert(preparedFeedbacks);
                    if (error) console.warn('Batch restore feedbacks warning:', error);
                }
                if (cleanComplaints.length > 0) {
                    const { error } = await client.from('complaints').upsert(cleanComplaints);
                    if (error) console.warn('Batch restore complaints warning:', error);
                }
            } else {
                cleanFeedbacks.forEach(f => saveOffline('pendingFeedbacks', f));
                cleanComplaints.forEach(c => saveOffline('pendingComplaints', c));
            }

            const restoredFIds = new Set(batchFeedbacks.map(f => f.id));
            const restoredCIds = new Set(batchComplaints.map(c => c.id));

            archivedVault.feedbacks = (archivedVault.feedbacks || []).filter(f => !restoredFIds.has(f.id));
            archivedVault.complaints = (archivedVault.complaints || []).filter(c => !restoredCIds.has(c.id));
            archivedVault.batches = (archivedVault.batches || []).filter(batch => batch.id !== batchId);

            await saveArchivedVault();
            await fetchAdminData();
            renderArchivedVaultView();

            Swal.fire({
                title: 'Batch Restored!',
                html: `Successfully restored <strong>${totalToRestore} record(s)</strong> back to the live dashboard!`,
                icon: 'success',
                confirmButtonColor: '#059669',
                customClass: { popup: 'rounded-2xl' }
            });
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to restore batch: ' + (err.message || err), 'error');
        }
    };

    window.openRestoreBatchChooserModal = async function() {
        const allItems = [...(archivedVault.feedbacks || []), ...(archivedVault.complaints || [])];
        if (allItems.length === 0) {
            Swal.fire({
                title: 'No Archives Stored',
                text: 'There are currently no archived records in the vault to restore.',
                icon: 'info',
                confirmButtonColor: '#22007c',
                customClass: { popup: 'rounded-3xl' }
            });
            return;
        }

        const groups = groupItemsByArchivedTime(allItems);
        if (groups.length === 0) {
            showToast('No archived batches found to restore.', 'info');
            return;
        }

        const optionsHtml = groups.map(g => {
            const feedbacks = g.items.filter(i => i.office_visited !== undefined || i.mean_score !== undefined);
            const complaints = g.items.filter(i => i.details_of_complaint !== undefined || i.place_of_incident !== undefined);
            return `
                <option value="${escapeHtml(g.batchId)}">
                    ${escapeHtml(g.label)} — ${g.items.length} records (${feedbacks.length} feedbacks, ${complaints.length} complaints)
                </option>
            `;
        }).join('');

        const { value: selectedBatchId } = await Swal.fire({
            title: '<i class="fa-solid fa-rotate-left text-emerald-600 mr-2"></i>Choose Batch to Restore',
            html: `
                <p class="text-xs text-slate-500 font-medium mb-3 text-left">
                    Select an archived batch from the dropdown list below to restore all its records back to the active live dashboard:
                </p>
                <div class="text-left space-y-1">
                    <label class="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">Select Archive Batch:</label>
                    <select id="swal-restore-batch-select" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-bisu-blue focus:ring-1 focus:ring-bisu-blue">
                        ${optionsHtml}
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fa-solid fa-rotate-left mr-1"></i> Restore Batch',
            confirmButtonColor: '#059669',
            cancelButtonText: 'Cancel',
            customClass: { popup: 'rounded-3xl shadow-2xl' },
            preConfirm: () => {
                return document.getElementById('swal-restore-batch-select')?.value;
            }
        });

        if (selectedBatchId) {
            await window.restoreArchivedBatch(selectedBatchId);
        }
    };

    window.deleteArchivedRecord = async function(id, type = 'feedback') {
        const res = await Swal.fire({
            title: 'Delete from Vault?',
            text: 'This will permanently remove this record from the archived vault.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete Permanently',
            confirmButtonColor: '#dc2626',
            customClass: { popup: 'rounded-2xl' }
        });

        if (!res.isConfirmed) return;

        if (type === 'feedback') {
            archivedVault.feedbacks = archivedVault.feedbacks.filter(f => f.id !== id);
        } else {
            archivedVault.complaints = archivedVault.complaints.filter(c => c.id !== id);
        }

        await saveArchivedVault();
        renderArchivedVaultView();
        showToast('Record deleted from vault.', 'success');
    };

    window.downloadBatchSpreadsheet = function(batchId) {
        const b = (archivedVault.batches || []).find(batch => batch.id === batchId);
        
        let batchFeedbacks = (archivedVault.feedbacks || []).filter(f => f.batch_id === batchId);
        let batchComplaints = (archivedVault.complaints || []).filter(c => c.batch_id === batchId);

        if (batchFeedbacks.length === 0 && b && Array.isArray(b.feedbacks)) {
            batchFeedbacks = b.feedbacks;
        }
        if (batchComplaints.length === 0 && b && Array.isArray(b.complaints)) {
            batchComplaints = b.complaints;
        }

        if (batchFeedbacks.length === 0 && batchComplaints.length === 0) {
            showToast('No archived records found in this batch to export.', 'info');
            return;
        }

        const rawName = b?.scope || b?.name || 'Archive_Batch';
        const safeName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadArchiveSpreadsheet(batchFeedbacks, batchComplaints, `BISU_${safeName}`);
    };

    window.deleteBatchArchive = async function(batchId) {
        const res = await Swal.fire({
            title: 'Delete Archive Batch?',
            text: 'This removes the batch log entry from history.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete Batch Log',
            confirmButtonColor: '#dc2626',
            customClass: { popup: 'rounded-2xl' }
        });

        if (!res.isConfirmed) return;

        archivedVault.batches = (archivedVault.batches || []).filter(b => b.id !== batchId);
        await saveArchivedVault();
        renderArchivedVaultView();
        showToast('Batch log removed.', 'success');
    };

    // Event Listeners for Vault Modal
    if (viewArchivedBtn) viewArchivedBtn.addEventListener('click', openArchivedVaultModal);
    if (closeArchivedBtn) closeArchivedBtn.addEventListener('click', closeArchivedVaultModal);
    if (viewArchivedModal) {
        viewArchivedModal.addEventListener('click', (e) => {
            if (e.target === viewArchivedModal) {
                closeArchivedVaultModal();
            }
        });
    }

    if (archiveTabFeedbacks) archiveTabFeedbacks.addEventListener('click', () => switchArchiveTab('feedbacks'));
    if (archiveTabComplaints) archiveTabComplaints.addEventListener('click', () => switchArchiveTab('complaints'));
    if (archiveTabBatches) archiveTabBatches.addEventListener('click', () => switchArchiveTab('batches'));

    if (archivedSearchInput) {
        archivedSearchInput.addEventListener('input', () => {
            renderArchivedVaultView();
        });
    }

    const archivedMonthFilter = document.getElementById('archived-month-filter');
    if (archivedMonthFilter) {
        archivedMonthFilter.addEventListener('change', () => {
            renderArchivedVaultView();
        });
    }

    const exportSelectedBatchBtn = document.getElementById('export-selected-batch-btn');
    if (exportSelectedBatchBtn) {
        exportSelectedBatchBtn.addEventListener('click', async () => {
            const currentFilter = document.getElementById('archived-month-filter')?.value || 'ALL';
            
            if (currentFilter !== 'ALL') {
                downloadBatchSpreadsheet(currentFilter);
                return;
            }

            let batches = archivedVault.batches || [];
            if (batches.length === 0) {
                const batchMap = new Map();
                [...(archivedVault.feedbacks || []), ...(archivedVault.complaints || [])].forEach(item => {
                    const bId = item.batch_id || 'legacy';
                    if (!batchMap.has(bId)) {
                        batchMap.set(bId, { id: bId, scope: item.scope || 'Archive Batch' });
                    }
                });
                batches = Array.from(batchMap.values());
            }

            if (batches.length === 0) {
                showToast('No archive batches available to export.', 'info');
                return;
            }

            const optionsHtml = batches.map(b => {
                const name = b.scope || b.name || 'Archive Batch';
                const fCount = (archivedVault.feedbacks || []).filter(f => f.batch_id === b.id).length;
                const cCount = (archivedVault.complaints || []).filter(c => c.batch_id === b.id).length;
                const total = fCount + cCount;
                return `<option value="${escapeHtml(b.id)}">${escapeHtml(name)} (${total} records)</option>`;
            }).join('');

            const { value: selectedBatchId } = await Swal.fire({
                title: 'Export Batch to Excel',
                html: `
                    <div class="text-left space-y-2 mt-2">
                        <label class="block font-bold text-xs text-slate-700">Select Batch to Download:</label>
                        <select id="swal-export-batch-select" class="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-800 bg-slate-50 focus:ring-2 focus:ring-bisu-blue focus:outline-none">
                            ${optionsHtml}
                        </select>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '<i class="fa-solid fa-file-excel mr-1"></i> Export Excel',
                confirmButtonColor: '#059669',
                cancelButtonText: 'Cancel',
                customClass: { popup: 'rounded-3xl shadow-2xl font-sans' },
                preConfirm: () => {
                    return document.getElementById('swal-export-batch-select')?.value;
                }
            });

            if (selectedBatchId) {
                downloadBatchSpreadsheet(selectedBatchId);
            }
        });
    }

    if (exportAllArchivesBtn) {
        exportAllArchivesBtn.addEventListener('click', () => {
            if ((archivedVault.feedbacks?.length || 0) === 0 && (archivedVault.complaints?.length || 0) === 0) {
                showToast('No archived records in vault to export.', 'info');
                return;
            }
            downloadArchiveSpreadsheet(archivedVault.feedbacks, archivedVault.complaints, 'BISU_All_Archived_Vault');
        });
    }

    if (clearAllArchivesBtn) {
        clearAllArchivesBtn.addEventListener('click', async () => {
            const { value: confirmClear } = await Swal.fire({
                title: 'Clear Entire Vault?',
                html: 'This will <strong>permanently delete ALL archived feedbacks and complaints</strong> from the vault.<br><br>Please type <strong>CLEAR VAULT</strong> to confirm:',
                input: 'text',
                showCancelButton: true,
                confirmButtonText: 'Clear Vault',
                confirmButtonColor: '#dc2626',
                customClass: { popup: 'rounded-2xl border-t-8 border-red-500' },
                preConfirm: (val) => val === 'CLEAR VAULT' || Swal.showValidationMessage('Type CLEAR VAULT to confirm')
            });

            if (confirmClear) {
                archivedVault = { feedbacks: [], complaints: [], batches: [] };
                await saveArchivedVault();
                renderArchivedVaultView();
                showToast('Archived vault cleared.', 'success');
            }
        });
    }

    // Filter selectors
    const filterDateInput = document.getElementById('filter-date-input');
    const filterMonthSelect = document.getElementById('filter-month-select');
    const filterYearSelect = document.getElementById('filter-year-select');
    const filterTimeSelect = document.getElementById('filter-time-select');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    if (filterDateInput) {
        filterDateInput.addEventListener('change', applyFiltersAndRender);
        filterDateInput.addEventListener('input', applyFiltersAndRender);
    }
    if (filterMonthSelect) {
        filterMonthSelect.addEventListener('change', applyFiltersAndRender);
    }
    if (filterYearSelect) {
        filterYearSelect.addEventListener('change', applyFiltersAndRender);
    }
    if (filterTimeSelect) {
        filterTimeSelect.addEventListener('change', applyFiltersAndRender);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterDateInput) filterDateInput.value = '';
            if (filterMonthSelect) filterMonthSelect.value = 'all';
            if (filterYearSelect) filterYearSelect.value = 'all';
            if (filterTimeSelect) filterTimeSelect.value = 'all';
            applyFiltersAndRender();
        });
    }

    // Clear buttons
    if (clearFeedbackBtn) {
        clearFeedbackBtn.addEventListener('click', () => {
            resetFeedbackForm();
            showToast('Form cleared.', 'info');
        });
    }

    if (clearComplaintBtn) {
        clearComplaintBtn.addEventListener('click', () => {
            complaintForm.reset();
            showToast('Form cleared.', 'info');
        });
    }

    // Try syncing any pending on load
    setTimeout(() => {
        syncOfflineData();
    }, 2000);

    // Mobile Sidebar Toggle Listener
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarContent = document.getElementById('sidebar-content');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');

    if (sidebarToggleBtn && sidebarContent) {
        sidebarToggleBtn.addEventListener('click', () => {
            const isHidden = sidebarContent.classList.contains('hidden');
            if (isHidden) {
                sidebarContent.classList.remove('hidden');
                sidebarContent.classList.add('flex');
                if (sidebarToggleIcon) {
                    sidebarToggleIcon.classList.remove('fa-bars');
                    sidebarToggleIcon.classList.add('fa-xmark');
                }
            } else {
                sidebarContent.classList.add('hidden');
                sidebarContent.classList.remove('flex');
                if (sidebarToggleIcon) {
                    sidebarToggleIcon.classList.remove('fa-xmark');
                    sidebarToggleIcon.classList.add('fa-bars');
                }
            }
        });

        // Close mobile sidebar automatically when any navigation/action button inside it is tapped
        sidebarContent.querySelectorAll('button, a, select').forEach(interactiveEl => {
            interactiveEl.addEventListener('click', () => {
                if (window.innerWidth < 1280 && !interactiveEl.closest('select')) {
                    sidebarContent.classList.add('hidden');
                    sidebarContent.classList.remove('flex');
                    if (sidebarToggleIcon) {
                        sidebarToggleIcon.classList.remove('fa-xmark');
                        sidebarToggleIcon.classList.add('fa-bars');
                    }
                }
            });
        });
    }

    // ==========================================
    // QR CODE GENERATOR & MANAGEMENT SYSTEM
    // ==========================================
    const manageQrCodeBtn = document.getElementById('manage-qrcode-btn');
    const manageQrCodeModal = document.getElementById('manage-qrcode-modal');
    const closeQrCodeBtn = document.getElementById('close-qrcode-btn');
    const qrOfficeSelect = document.getElementById('qr-office-select');
    const qrStationInput = document.getElementById('qr-station-input');
    const qrBaseUrlInput = document.getElementById('qr-baseurl-input');
    const qrKioskMode = document.getElementById('qr-kiosk-mode');
    const btnRenderQr = document.getElementById('btn-render-qr');

    const qrPreviewOfficeTitle = document.getElementById('qr-preview-office-title');
    const qrPreviewStationTitle = document.getElementById('qr-preview-station-title');
    const qrPreviewCanvas = document.getElementById('qr-preview-canvas');
    const qrPreviewUrlText = document.getElementById('qr-preview-url-text');

    const btnSaveQr = document.getElementById('btn-save-qr');
    const btnCopyQrLink = document.getElementById('btn-copy-qr-link');
    const btnDownloadQrPng = document.getElementById('btn-download-qr-png');
    const btnPrintQrPoster = document.getElementById('btn-print-qr-poster');
    const btnPrintAllQrs = document.getElementById('btn-print-all-qrs');

    const qrTabGenerate = document.getElementById('qr-tab-generate');
    const qrTabGallery = document.getElementById('qr-tab-gallery');
    const qrContentGenerate = document.getElementById('qr-content-generate');
    const qrContentGallery = document.getElementById('qr-content-gallery');
    const qrCountBadge = document.getElementById('qr-count-badge');
    const qrGalleryGrid = document.getElementById('qr-gallery-grid');

    let savedQrsList = [];

    async function loadSavedQrsFromDatabase() {
        try {
            const client = await getSupabaseClient();
            if (client) {
                // 1. Try reading from qr_codes table
                const { data: qrData, error: qrErr } = await client
                    .from('qr_codes')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!qrErr && Array.isArray(qrData) && qrData.length > 0) {
                    savedQrsList = qrData.map(q => ({
                        id: q.id,
                        office: q.office,
                        station: q.station || '',
                        kiosk: q.kiosk ?? true,
                        url: q.url,
                        createdAt: q.created_at ? new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (q.createdAt || '')
                    }));
                    localStorage.setItem('bisuSavedQrs', JSON.stringify(savedQrsList));
                    updateQrBadge();
                    return savedQrsList;
                }

                // 2. Fallback to admin_settings table where id = 'saved_qrs'
                const { data: settingsData, error: settingsErr } = await client
                    .from('admin_settings')
                    .select('config')
                    .eq('id', 'saved_qrs')
                    .maybeSingle();

                if (!settingsErr && settingsData && settingsData.config && Array.isArray(settingsData.config)) {
                    savedQrsList = settingsData.config;
                    localStorage.setItem('bisuSavedQrs', JSON.stringify(savedQrsList));
                    updateQrBadge();
                    return savedQrsList;
                }
            }
        } catch(e) {
            console.warn('Could not load QR codes from Supabase database:', e);
        }

        // Fallback to localStorage
        try {
            savedQrsList = JSON.parse(localStorage.getItem('bisuSavedQrs')) || [];
        } catch(e) {
            savedQrsList = [];
        }
        updateQrBadge();
        return savedQrsList;
    }

    function getSavedQrs() {
        return savedQrsList;
    }

    async function saveQrsToDatabase(qrs, newQr = null) {
        savedQrsList = qrs;
        localStorage.setItem('bisuSavedQrs', JSON.stringify(qrs));
        updateQrBadge();

        try {
            const client = await getSupabaseClient();
            if (client) {
                // Save to admin_settings table under id 'saved_qrs'
                const { error: settingsErr } = await client.from('admin_settings').upsert({
                    id: 'saved_qrs',
                    config: qrs,
                    updated_at: new Date().toISOString()
                });
                if (settingsErr) console.warn('admin_settings saved_qrs upsert error:', settingsErr);

                // Also save to qr_codes table
                if (newQr) {
                    const { error: qrErr } = await client.from('qr_codes').upsert({
                        id: newQr.id,
                        office: newQr.office,
                        station: newQr.station || '',
                        kiosk: newQr.kiosk ?? true,
                        url: newQr.url,
                        created_at: new Date().toISOString()
                    });
                    if (qrErr) console.warn('qr_codes upsert error:', qrErr);
                } else if (qrs.length > 0) {
                    const rows = qrs.map(q => ({
                        id: q.id,
                        office: q.office,
                        station: q.station || '',
                        kiosk: q.kiosk ?? true,
                        url: q.url
                    }));
                    await client.from('qr_codes').upsert(rows);
                }
            }
        } catch(e) {
            console.warn('Error saving QR code to database:', e);
        }
    }

    function saveQrsToStorage(qrs) {
        saveQrsToDatabase(qrs);
    }

    function updateQrBadge() {
        const qrs = getSavedQrs();
        if (qrCountBadge) qrCountBadge.textContent = qrs.length;
    }

    function getCleanPublicBaseUrl() {
        if (qrBaseUrlInput && qrBaseUrlInput.value.trim()) {
            return qrBaseUrlInput.value.trim();
        }
        let origin = window.location.origin;
        if (origin.includes('ais-dev-')) {
            origin = origin.replace('ais-dev-', 'ais-pre-');
        }
        return origin + window.location.pathname;
    }

    function generateFeedbackTargetUrl(office, station, kiosk) {
        const base = getCleanPublicBaseUrl();
        let urlObj;
        try {
            urlObj = new URL(base, window.location.href);
        } catch(e) {
            urlObj = new URL(window.location.href);
        }
        if (office) urlObj.searchParams.set('office', office);
        if (station) urlObj.searchParams.set('station', station);
        if (kiosk) urlObj.searchParams.set('kiosk', 'true');
        urlObj.searchParams.set('mode', 'feedback');
        return urlObj.toString();
    }

    function renderCurrentQrPreview() {
        if (!qrPreviewCanvas) return;
        const office = qrOfficeSelect ? qrOfficeSelect.value : '';
        const station = qrStationInput ? qrStationInput.value.trim() : '';
        const kiosk = qrKioskMode ? qrKioskMode.checked : true;

        const targetUrl = generateFeedbackTargetUrl(office, station, kiosk);

        if (qrPreviewOfficeTitle) {
            qrPreviewOfficeTitle.textContent = office || 'All Offices (General Feedback)';
        }
        if (qrPreviewStationTitle) {
            if (station) {
                qrPreviewStationTitle.textContent = `Station: ${station}`;
                qrPreviewStationTitle.classList.remove('hidden');
            } else {
                qrPreviewStationTitle.classList.add('hidden');
            }
        }
        if (qrPreviewUrlText) {
            qrPreviewUrlText.textContent = targetUrl;
        }

        if (typeof QRious !== 'undefined') {
            new QRious({
                element: qrPreviewCanvas,
                value: targetUrl,
                size: 260,
                level: 'H'
            });
        }
    }

    if (manageQrCodeBtn && manageQrCodeModal) {
        manageQrCodeBtn.addEventListener('click', async () => {
            if (qrBaseUrlInput && !qrBaseUrlInput.value.trim()) {
                qrBaseUrlInput.value = getCleanPublicBaseUrl();
            }

            if (qrOfficeSelect) {
                const isOffice = currentUserRole === 'office' && !!currentOfficeScope;
                if (isOffice) {
                    qrOfficeSelect.innerHTML = `<option value="${escapeHtml(currentOfficeScope)}">${escapeHtml(currentOfficeScope)}</option>`;
                    qrOfficeSelect.value = currentOfficeScope;
                    qrOfficeSelect.disabled = true;
                } else {
                    const currentVal = qrOfficeSelect.value;
                    qrOfficeSelect.disabled = false;
                    qrOfficeSelect.innerHTML = '<option value="">All Offices (General Feedback)</option>';
                    if (typeof formConfig !== 'undefined' && Array.isArray(formConfig.offices)) {
                        formConfig.offices.forEach(off => {
                            qrOfficeSelect.innerHTML += `<option value="${off}">${off}</option>`;
                        });
                    }
                    qrOfficeSelect.value = currentVal;
                }
            }

            await loadSavedQrsFromDatabase();

            renderCurrentQrPreview();
            updateQrBadge();
            renderSavedQrGallery();

            manageQrCodeModal.classList.remove('hidden');
            manageQrCodeModal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeQrCodeBtn && manageQrCodeModal) {
        closeQrCodeBtn.addEventListener('click', () => {
            manageQrCodeModal.classList.add('hidden');
            manageQrCodeModal.classList.remove('flex');
            document.body.style.overflow = '';
        });
    }

    if (manageQrCodeModal) {
        manageQrCodeModal.addEventListener('click', (e) => {
            if (e.target === manageQrCodeModal && closeQrCodeBtn) {
                closeQrCodeBtn.click();
            }
        });
    }

    if (qrTabGenerate && qrTabGallery) {
        qrTabGenerate.addEventListener('click', () => {
            qrTabGenerate.classList.add('border-bisu-blue', 'text-bisu-blue');
            qrTabGenerate.classList.remove('border-transparent', 'text-slate-500');
            qrTabGallery.classList.remove('border-bisu-blue', 'text-bisu-blue');
            qrTabGallery.classList.add('border-transparent', 'text-slate-500');

            qrContentGenerate.classList.remove('hidden');
            qrContentGallery.classList.add('hidden');
        });

        qrTabGallery.addEventListener('click', () => {
            qrTabGallery.classList.add('border-bisu-blue', 'text-bisu-blue');
            qrTabGallery.classList.remove('border-transparent', 'text-slate-500');
            qrTabGenerate.classList.remove('border-bisu-blue', 'text-bisu-blue');
            qrTabGenerate.classList.add('border-transparent', 'text-slate-500');

            qrContentGallery.classList.remove('hidden');
            qrContentGenerate.classList.add('hidden');

            renderSavedQrGallery();
        });
    }

    if (btnRenderQr) btnRenderQr.addEventListener('click', renderCurrentQrPreview);
    if (qrOfficeSelect) qrOfficeSelect.addEventListener('change', renderCurrentQrPreview);
    if (qrStationInput) qrStationInput.addEventListener('input', renderCurrentQrPreview);
    if (qrBaseUrlInput) qrBaseUrlInput.addEventListener('input', renderCurrentQrPreview);
    if (qrKioskMode) qrKioskMode.addEventListener('change', renderCurrentQrPreview);

    if (btnCopyQrLink) {
        btnCopyQrLink.addEventListener('click', () => {
            const office = qrOfficeSelect ? qrOfficeSelect.value : '';
            const station = qrStationInput ? qrStationInput.value.trim() : '';
            const kiosk = qrKioskMode ? qrKioskMode.checked : true;
            const targetUrl = generateFeedbackTargetUrl(office, station, kiosk);

            navigator.clipboard.writeText(targetUrl).then(() => {
                showToast('Feedback QR URL copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Unable to copy to clipboard', 'error');
            });
        });
    }

    if (btnDownloadQrPng) {
        btnDownloadQrPng.addEventListener('click', () => {
            if (!qrPreviewCanvas) return;
            const office = qrOfficeSelect ? qrOfficeSelect.value : 'General';
            const link = document.createElement('a');
            link.download = `BISU_Feedback_QR_${(office || 'General').replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            link.href = qrPreviewCanvas.toDataURL('image/png');
            link.click();
            showToast('QR Code PNG image downloaded!', 'success');
        });
    }

    if (btnSaveQr) {
        btnSaveQr.addEventListener('click', async () => {
            const office = qrOfficeSelect ? qrOfficeSelect.value : '';
            const station = qrStationInput ? qrStationInput.value.trim() : '';
            const kiosk = qrKioskMode ? qrKioskMode.checked : true;
            const targetUrl = generateFeedbackTargetUrl(office, station, kiosk);

            const qrs = [...getSavedQrs()];
            const newQr = {
                id: 'qr_' + Date.now(),
                office: office || 'All Offices (General)',
                station: station || '',
                kiosk: kiosk,
                url: targetUrl,
                createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            };

            qrs.unshift(newQr);

            btnSaveQr.disabled = true;
            const originalHtml = btnSaveQr.innerHTML;
            btnSaveQr.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...';

            await saveQrsToDatabase(qrs, newQr);

            btnSaveQr.disabled = false;
            btnSaveQr.innerHTML = originalHtml;

            showToast(`Saved QR Code for "${newQr.office}" to Database!`, 'success');
            qrTabGallery.click();
        });
    }

    function generatePosterPrintCardHtml(office, station, url, canvasData) {
        const bisuLogo = cachedLogos.bisu || new URL('/images/BISU.webp', window.location.origin).href;
        const bagongPilipinasLogo = cachedLogos.bagongPilipinas || new URL('/images/BAGONG-PILIPINAS-LOGO-1-1.webp', window.location.origin).href;
        const tuvLogo = cachedLogos.tuv || new URL('/images/images.webp', window.location.origin).href;

        return `
            <div class="bg-white border-4 border-[#180058] rounded-3xl overflow-hidden shadow-2xl max-w-xl w-full mx-auto text-center flex flex-col items-center relative print:shadow-none print:border-4 print:max-w-none print:w-full page-break-after">
                <!-- Top Tri-Color Accent Bar -->
                <div class="w-full h-3 bg-gradient-to-r from-[#8b0000] via-[#d4af37] to-[#180058]"></div>

                <div class="p-8 w-full flex flex-col items-center">
                    <!-- Header with All 3 Logos -->
                    <div class="flex items-center justify-between border-b-2 border-slate-200 pb-5 mb-6 w-full gap-3">
                        <!-- Left Logo: BISU -->
                        <img src="${bisuLogo}" class="w-20 h-20 object-contain shrink-0" alt="BISU Seal">
                        
                        <!-- Center Text -->
                        <div class="text-center flex-1">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block leading-none mb-1">Republic of the Philippines</span>
                            <h1 class="text-xl font-black text-[#180058] tracking-tight uppercase leading-snug">Bohol Island State University</h1>
                            <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wide">Calape Campus • Calape, Bohol</h2>
                            <p class="text-[10px] font-semibold text-slate-500 mt-0.5">Quality Management System (ISO 9001:2015)</p>
                        </div>

                        <!-- Right Logos: Bagong Pilipinas & TUV Rheinland ISO -->
                        <div class="flex items-center gap-2 shrink-0">
                            <img src="${bagongPilipinasLogo}" class="w-16 h-16 object-contain" alt="Bagong Pilipinas">
                            <img src="${tuvLogo}" class="w-16 h-16 object-contain rounded" alt="ISO Seal">
                        </div>
                    </div>

                    <!-- Survey & Office Title Banner -->
                    <div class="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200 rounded-2xl p-5 w-full mb-6 text-center shadow-xs">
                        <span class="text-xs font-black uppercase tracking-widest text-[#180058] block mb-1">Customer Satisfaction Survey</span>
                        <h3 class="text-2xl font-extrabold text-slate-900 leading-tight">${office || 'All Offices (General Feedback)'}</h3>
                        ${station ? `<div class="inline-block bg-white border border-blue-200 rounded-full px-4 py-1 text-xs font-bold text-slate-700 mt-2 shadow-2xs">Station / Counter: ${station}</div>` : ''}
                    </div>

                    <!-- High Visibility QR Container -->
                    <div class="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-md mb-6 relative">
                        <img src="${canvasData}" class="w-72 h-72 object-contain mx-auto" alt="Feedback QR Code">
                    </div>

                    <!-- Clear Instructions Callout -->
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full text-center mb-6">
                        <h4 class="text-sm font-extrabold text-[#180058] tracking-wide uppercase flex items-center justify-center gap-2 mb-2">
                            <i class="fa-solid fa-camera"></i> SCAN WITH YOUR SMARTPHONE CAMERA
                        </h4>
                        <div class="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-700">
                            <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">1. Open Camera</div>
                            <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">2. Point at QR Code</div>
                            <div class="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">3. Tap Link & Submit</div>
                        </div>
                    </div>

                    <!-- ARTA Citizen's Charter Footer Note -->
                    <p class="text-[10px] text-slate-500 font-medium italic max-w-md leading-relaxed mb-4">
                        "Pursuant to Republic Act No. 11032 (Ease of Doing Business and Efficient Government Service Delivery Act of 2018). Your feedback directly powers our continuous service improvement."
                    </p>

                    <!-- Monospace URL -->
                    <div class="text-[10px] font-mono font-semibold text-slate-400 border-t border-slate-200 pt-3 w-full truncate">${url}</div>
                </div>

                <!-- Bottom Tri-Color Accent Bar -->
                <div class="w-full h-2 bg-gradient-to-r from-[#180058] via-[#d4af37] to-[#8b0000]"></div>
            </div>
        `;
    }

    function printWindowOrIframe(htmlContent) {
        let printWin = null;
        try {
            printWin = window.open('', '_blank', 'width=900,height=1000');
        } catch (e) {
            printWin = null;
        }

        if (printWin) {
            printWin.document.open();
            printWin.document.write(htmlContent);
            printWin.document.close();
            return;
        }

        // Fallback to hidden iframe
        let iframe = document.getElementById('bisu-print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'bisu-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.top = '-9999px';
            iframe.style.left = '-9999px';
            iframe.style.width = '1000px';
            iframe.style.height = '1000px';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.error('Poster iframe print error:', err);
            }
        }, 500);
    }

    if (btnPrintQrPoster) {
        btnPrintQrPoster.addEventListener('click', () => {
            const canvasData = qrPreviewCanvas ? qrPreviewCanvas.toDataURL('image/png') : '';
            const office = qrOfficeSelect ? qrOfficeSelect.value : 'All Offices (General Feedback)';
            const station = qrStationInput ? qrStationInput.value.trim() : '';
            const targetUrl = generateFeedbackTargetUrl(office, station, true);

            const posterHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print QR Poster - ${escapeHtml(office)}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        @media print {
                            body { margin: 0; padding: 0; background: white; }
                            .no-print { display: none !important; }
                        }
                    </style>
                </head>
                <body class="bg-slate-100 min-h-screen flex items-center justify-center p-6">
                    <div class="no-print fixed top-4 right-4 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 flex gap-2 z-50">
                        <button onclick="window.print()" class="bg-[#180058] text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer">
                            <i class="fa-solid fa-print"></i> Print Poster
                        </button>
                        <button onclick="window.close()" class="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer">Close</button>
                    </div>

                    ${generatePosterPrintCardHtml(office, station, targetUrl, canvasData)}
                </body>
                </html>
            `;
            printWindowOrIframe(posterHtml);
        });
    }

    function renderSavedQrGallery() {
        if (!qrGalleryGrid) return;
        const qrs = getSavedQrs();
        updateQrBadge();

        if (qrs.length === 0) {
            qrGalleryGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-slate-400 italic">
                    <i class="fa-solid fa-qrcode text-4xl mb-3 block opacity-30"></i>
                    No saved QR codes yet. Click "Generate New QR Code" to create one!
                </div>
            `;
            return;
        }

        qrGalleryGrid.innerHTML = '';
        qrs.forEach(qr => {
            const card = document.createElement('div');
            card.className = 'bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative group';
            
            const canvasId = `qr_canvas_${qr.id}`;

            card.innerHTML = `
                <div>
                    <div class="flex items-start justify-between gap-2 mb-3">
                        <div>
                            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 inline-block mb-1">Station Poster</span>
                            <h4 class="font-extrabold text-slate-900 text-sm leading-snug">${escapeHtml(qr.office)}</h4>
                            ${qr.station ? `<p class="text-xs text-slate-500 font-medium">Station: ${escapeHtml(qr.station)}</p>` : ''}
                        </div>
                        <button type="button" onclick="deleteSavedQr('${qr.id}')" class="text-slate-300 hover:text-red-500 transition p-1" title="Delete QR Code">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>

                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-center mb-3">
                        <canvas id="${canvasId}" class="w-32 h-32"></canvas>
                    </div>

                    <p class="text-[11px] font-mono text-slate-400 truncate mb-3 px-1">${escapeHtml(qr.url)}</p>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onclick="copySavedQrUrl('${qr.id}')" class="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1 cursor-pointer">
                        <i class="fa-solid fa-copy"></i> Copy Link
                    </button>
                    <button type="button" onclick="printSavedQrPoster('${qr.id}')" class="py-1.5 px-2 bg-bisu-blue hover:bg-bisu-blue-dark text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1 shadow-xs cursor-pointer">
                        <i class="fa-solid fa-print"></i> Print Poster
                    </button>
                </div>
            `;

            qrGalleryGrid.appendChild(card);

            setTimeout(() => {
                const cvs = document.getElementById(canvasId);
                if (cvs && typeof QRious !== 'undefined') {
                    new QRious({
                        element: cvs,
                        value: qr.url,
                        size: 160,
                        level: 'H'
                    });
                }
            }, 50);
        });
    }

    window.deleteSavedQr = async function(id) {
        let qrs = getSavedQrs();
        qrs = qrs.filter(q => q.id !== id);
        savedQrsList = qrs;
        localStorage.setItem('bisuSavedQrs', JSON.stringify(qrs));
        updateQrBadge();
        renderSavedQrGallery();

        try {
            const client = await getSupabaseClient();
            if (client) {
                // Delete from qr_codes table
                await client.from('qr_codes').delete().eq('id', id);

                // Update admin_settings table
                await client.from('admin_settings').upsert({
                    id: 'saved_qrs',
                    config: qrs,
                    updated_at: new Date().toISOString()
                });
            }
        } catch(e) {
            console.warn('Error deleting QR code from database:', e);
        }

        showToast('QR Code removed from gallery & database', 'info');
    };

    window.copySavedQrUrl = function(id) {
        const qrs = getSavedQrs();
        const found = qrs.find(q => q.id === id);
        if (found) {
            navigator.clipboard.writeText(found.url).then(() => {
                showToast('URL copied to clipboard!', 'success');
            });
        }
    };

    window.printSavedQrPoster = function(id) {
        const qrs = getSavedQrs();
        const found = qrs.find(q => q.id === id);
        if (!found) return;

        const cvs = document.getElementById(`qr_canvas_${id}`);
        const canvasData = cvs ? cvs.toDataURL('image/png') : '';

        const posterHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print QR Poster - ${escapeHtml(found.office)}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    @media print {
                        body { margin: 0; padding: 0; background: white; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body class="bg-slate-100 min-h-screen flex items-center justify-center p-6">
                <div class="no-print fixed top-4 right-4 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 flex gap-2 z-50">
                    <button onclick="window.print()" class="bg-[#180058] text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer">
                        <i class="fa-solid fa-print"></i> Print Poster
                    </button>
                    <button onclick="window.close()" class="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer">Close</button>
                </div>

                ${generatePosterPrintCardHtml(found.office, found.station, found.url, canvasData)}
            </body>
            </html>
        `;
        printWindowOrIframe(posterHtml);
    };

    if (btnPrintAllQrs) {
        btnPrintAllQrs.addEventListener('click', () => {
            const qrs = getSavedQrs();
            if (qrs.length === 0) {
                showToast('No saved QR posters to print.', 'error');
                return;
            }

            let cardsHtml = '';
            qrs.forEach(qr => {
                const cvs = document.getElementById(`qr_canvas_${qr.id}`);
                const canvasData = cvs ? cvs.toDataURL('image/png') : '';
                cardsHtml += generatePosterPrintCardHtml(qr.office, qr.station, qr.url, canvasData);
            });

            const allPostersHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print All QR Posters - BISU Calape</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        @media print {
                            body { margin: 0; padding: 0; background: white; }
                            .no-print { display: none !important; }
                            .page-break-after { page-break-after: always; margin-bottom: 2rem; }
                        }
                    </style>
                </head>
                <body class="bg-slate-100 min-h-screen p-8">
                    <div class="no-print fixed top-4 right-4 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 flex gap-2 z-50">
                        <button onclick="window.print()" class="bg-[#180058] text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-blue-900 transition flex items-center gap-2 cursor-pointer">
                            <i class="fa-solid fa-print"></i> Print All Posters
                        </button>
                        <button onclick="window.close()" class="bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer">Close</button>
                    </div>

                    <div class="max-w-xl mx-auto space-y-8">
                        ${cardsHtml}
                    </div>
                </body>
                </html>
            `;
            printWindowOrIframe(allPostersHtml);
        });
    }

    // ==========================================
    // URL ROUTING & HISTORY SYNCHRONIZATION
    // ==========================================
    let isHandlingPopState = false;

    function syncUrlRoute(mode, extraParams = {}) {
        if (isHandlingPopState) return;
        try {
            const currentUrl = new URL(window.location.href);
            const params = currentUrl.searchParams;

            if (mode === 'feedback') {
                params.delete('mode');
                params.delete('type');
            } else if (mode === 'complaint') {
                params.set('mode', 'complaint');
                params.delete('type');
            } else if (mode === 'admin') {
                params.set('mode', 'admin');
                params.delete('type');
            }

            if (extraParams.office) {
                params.set('office', extraParams.office);
            }

            const newSearch = params.toString() ? `?${params.toString()}` : '';
            const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
            
            const currentPathWithSearch = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            if (newUrl !== currentPathWithSearch) {
                window.history.pushState({ mode, office: extraParams.office || params.get('office') || '' }, '', newUrl);
            }
        } catch (e) {
            console.warn('URL routing sync notice:', e);
        }
    }

    function applyRouteFromUrl(isPopState = false) {
        const urlParams = new URLSearchParams(window.location.search);
        const modeParam = urlParams.get('mode');
        const typeParam = urlParams.get('type');
        const officeParam = urlParams.get('office');

        if (modeParam === 'admin') {
            const hasLocalAdmin = localStorage.getItem('isLocalAdmin') === 'true' || localStorage.getItem('isLocalOfficeUser') === 'true';
            if (hasLocalAdmin) {
                openAdminView(false);
                if (typeof fetchAdminData === 'function') fetchAdminData();
            } else {
                (async () => {
                    const client = await getSupabaseClient();
                    if (client) {
                        const adminAllowed = await isCurrentUserAdmin(client);
                        if (adminAllowed) {
                            openAdminView(false);
                            if (typeof fetchAdminData === 'function') fetchAdminData();
                            return;
                        }
                    }
                    showToast('Admin login required to view dashboard.', 'info');
                    if (typeof openAdminLoginModal === 'function') openAdminLoginModal();
                    showDefaultView(false);
                })();
            }
        } else if (modeParam === 'complaint' || typeParam === 'complaint') {
            switchToComplaintView(officeParam || '', false);
        } else {
            showDefaultView(false);
        }
    }

    window.addEventListener('popstate', () => {
        isHandlingPopState = true;
        try {
            applyRouteFromUrl(true);
        } finally {
            setTimeout(() => {
                isHandlingPopState = false;
            }, 50);
        }
    });

    // ==========================================
    // INITIAL URL QUERY PARAMETER ROUTING
    // ==========================================
    function handleUrlQueryParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const officeParam = urlParams.get('office');
        const stationParam = urlParams.get('station');
        const kioskParam = urlParams.get('kiosk');
        const modeParam = urlParams.get('mode');
        const typeParam = urlParams.get('type');

        const isFeedbackKiosk = kioskParam === 'true' || kioskParam === '1' || modeParam === 'kiosk' || modeParam === 'qr' || modeParam === 'feedback' || Boolean(officeParam);
        const isQrScan = urlParams.has('office') || urlParams.has('kiosk') || urlParams.has('mode') || urlParams.has('qr') || urlParams.has('station') || urlParams.get('source') === 'qr';

        // Show privacy modal only when user scans QR code
        if (isQrScan) {
            const privacyModal = document.getElementById('privacy-modal');
            const viewFeedback = document.getElementById('view-feedback');
            const consentCheckbox = document.getElementById('consent-checkbox');
            const acceptConsentBtn = document.getElementById('accept-consent-btn');
            if (privacyModal) {
                privacyModal.classList.remove('hidden');
                privacyModal.classList.add('flex');
            }
            if (viewFeedback) {
                viewFeedback.classList.add('section-hidden');
            }
            // Reset checkbox and button state
            if (consentCheckbox) {
                consentCheckbox.checked = false;
            }
            if (acceptConsentBtn) {
                acceptConsentBtn.disabled = true;
            }
        }

        if (isFeedbackKiosk) {
            const adminLoginBtn = document.getElementById('admin-login-btn');
            const adminLoginBtnMobile = document.getElementById('admin-login-btn-mobile');
            if (adminLoginBtn) adminLoginBtn.classList.add('hidden');
            if (adminLoginBtnMobile) adminLoginBtnMobile.classList.add('hidden');

            const toggleComplaintBtn = document.getElementById('toggle-complaint-btn');
            if (toggleComplaintBtn && (kioskParam === 'true' || modeParam === 'kiosk')) {
                toggleComplaintBtn.classList.add('hidden');
            }
        }

        if (officeParam) {
            const officeSelect = document.getElementById('office-visited');
            const qrBanner = document.getElementById('qr-office-banner');
            const qrBannerOfficeName = document.getElementById('qr-banner-office-name');
            const qrBannerStationName = document.getElementById('qr-banner-station-name');

            if (officeSelect) {
                setTimeout(() => {
                    let matchingOption = Array.from(officeSelect.options).find(opt => opt.value.toLowerCase() === officeParam.toLowerCase());
                    if (matchingOption) {
                        officeSelect.value = matchingOption.value;
                    } else {
                        const newOpt = document.createElement('option');
                        newOpt.value = officeParam;
                        newOpt.textContent = officeParam;
                        officeSelect.appendChild(newOpt);
                        officeSelect.value = officeParam;
                    }

                    const evt = new Event('change', { bubbles: true });
                    officeSelect.dispatchEvent(evt);
                }, 100);
            }

            if (qrBanner && qrBannerOfficeName) {
                qrBannerOfficeName.textContent = officeParam;
                if (stationParam && qrBannerStationName) {
                    qrBannerStationName.textContent = `Station: ${stationParam}`;
                    qrBannerStationName.classList.remove('hidden');
                }
                qrBanner.classList.remove('hidden');
            }
        }

        if (modeParam === 'complaint' || typeParam === 'complaint') {
            setTimeout(() => {
                switchToComplaintView(officeParam, false);
            }, 150);
        } else if (modeParam === 'admin') {
            setTimeout(() => {
                applyRouteFromUrl(false);
            }, 150);
        }
    }

    // ==========================================
    // COOKIE MANAGEMENT & NEW USER DETECTION
    // ==========================================
    function setCookie(name, value, days = 365) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    }

    function deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    function initCookieManager() {
        const cookieBanner = document.getElementById('cookie-banner');
        const cookieModal = document.getElementById('cookie-preferences-modal');
        const cookieVisitorBadge = document.getElementById('cookie-visitor-badge');
        const btnAcceptAll = document.getElementById('btn-accept-all-cookies');
        const btnAcceptEssential = document.getElementById('btn-accept-essential-cookies');
        const btnOpenModal = document.getElementById('btn-open-cookie-modal');
        const btnCloseModal = document.getElementById('close-cookie-modal-btn');
        const btnSavePrefs = document.getElementById('btn-save-cookie-prefs');
        const btnModalAcceptAll = document.getElementById('btn-modal-accept-all');
        const footerSettingsBtn = document.getElementById('footer-cookie-settings-btn');
        const footerYearEl = document.getElementById('footer-year');

        if (footerYearEl) {
            footerYearEl.textContent = new Date().getFullYear();
        }

        // Check URL for QR Code scanning query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const isQrScan = urlParams.has('office') || urlParams.has('kiosk') || urlParams.has('mode') || urlParams.has('qr') || urlParams.has('station') || urlParams.get('source') === 'qr';

        if (isQrScan) {
            setCookie('bisu_qr_scanned', 'true', 30);
            localStorage.setItem('bisu_qr_scanned', 'true');
            
            if (cookieVisitorBadge) {
                cookieVisitorBadge.innerHTML = '<i class="fa-solid fa-qrcode mr-1"></i> QR Code Visit';
                cookieVisitorBadge.className = 'bg-amber-400 text-slate-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center';
            }
        }

        // Check if consent has already been recorded
        const hasConsent = getCookie('bisu_cookie_consent') || localStorage.getItem('bisu_cookie_consent');

        if (!hasConsent) {
            // New user or QR Code scanner who hasn't consented yet! Set initial visitor session cookie
            let visitorId = getCookie('bisu_visitor_id') || localStorage.getItem('bisu_visitor_id');
            if (!visitorId) {
                visitorId = 'vis_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
                setCookie('bisu_visitor_id', visitorId, 365);
                localStorage.setItem('bisu_visitor_id', visitorId);
                setCookie('bisu_first_visit', new Date().toISOString(), 365);
                localStorage.setItem('bisu_first_visit', new Date().toISOString());
            }

            // Display cookie banner automatically (faster for QR code scans)
            const popupDelay = isQrScan ? 300 : 800;
            setTimeout(() => {
                if (cookieBanner) {
                    cookieBanner.classList.remove('pointer-events-none', 'translate-y-full', 'opacity-0');
                    cookieBanner.classList.add('translate-y-0', 'opacity-100');
                }
            }, popupDelay);
        } else {
            // Restore saved language preference from cookie if user previously saved
            const savedLang = getCookie('bisu_lang') || localStorage.getItem('bisu_lang');
            if (savedLang) {
                const langSelector = document.getElementById('language-selector');
                const langSelectorMobile = document.getElementById('language-selector-mobile');
                if (langSelector && langSelector.value !== savedLang) {
                    langSelector.value = savedLang;
                    if (langSelectorMobile) langSelectorMobile.value = savedLang;
                    langSelector.dispatchEvent(new Event('change'));
                }
            }
        }

        const hideBanner = () => {
            if (cookieBanner) {
                cookieBanner.classList.remove('translate-y-0', 'opacity-100');
                cookieBanner.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
            }
        };

        const saveConsent = (type = 'accepted') => {
            setCookie('bisu_cookie_consent', type, 365);
            localStorage.setItem('bisu_cookie_consent', type);
            setCookie('bisu_consent_date', new Date().toISOString(), 365);

            // Save language preference in cookie
            const currentLang = document.getElementById('language-selector')?.value || 'en';
            setCookie('bisu_lang', currentLang, 365);
            localStorage.setItem('bisu_lang', currentLang);

            hideBanner();
            if (cookieModal) cookieModal.classList.add('hidden');

            if (typeof showToast === 'function') {
                showToast('Cookie preferences saved successfully', 'success');
            }
        };

        if (btnAcceptAll) {
            btnAcceptAll.addEventListener('click', () => saveConsent('accepted'));
        }

        if (btnAcceptEssential) {
            btnAcceptEssential.addEventListener('click', () => saveConsent('essential'));
        }

        if (btnOpenModal) {
            btnOpenModal.addEventListener('click', () => {
                if (cookieModal) cookieModal.classList.remove('hidden');
            });
        }

        if (btnCloseModal) {
            btnCloseModal.addEventListener('click', () => {
                if (cookieModal) cookieModal.classList.add('hidden');
            });
        }

        if (btnSavePrefs) {
            btnSavePrefs.addEventListener('click', () => {
                const langPref = document.getElementById('cookie-pref-language')?.checked;
                const sessionPref = document.getElementById('cookie-pref-session')?.checked;
                const prefType = (langPref && sessionPref) ? 'custom_all' : 'essential';
                saveConsent(prefType);
            });
        }

        if (btnModalAcceptAll) {
            btnModalAcceptAll.addEventListener('click', () => saveConsent('accepted'));
        }

        if (footerSettingsBtn) {
            footerSettingsBtn.addEventListener('click', () => {
                if (cookieModal) cookieModal.classList.remove('hidden');
            });
        }

        // Persist language selection in cookie on selection change
        const langSelect = document.getElementById('language-selector');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                setCookie('bisu_lang', e.target.value, 365);
                localStorage.setItem('bisu_lang', e.target.value);
            });
        }

        const langSelectMobile = document.getElementById('language-selector-mobile');
        if (langSelectMobile) {
            langSelectMobile.addEventListener('change', (e) => {
                setCookie('bisu_lang', e.target.value, 365);
                localStorage.setItem('bisu_lang', e.target.value);
            });
        }
    }
});
