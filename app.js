class PDFOCRConverter {
    constructor() {
        this.pdfInput = document.getElementById('pdfInput');
        this.convertBtn = document.getElementById('convertBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.resultContainer = document.getElementById('resultContainer');

        this.convertBtn.addEventListener('click', () => this.convertPDFs());
    }

    async convertPDFs() {
        const files = this.pdfInput.files;
        if (files.length === 0) {
            alert('Please select PDF files');
            return;
        }

        this.progressContainer.innerHTML = '';
        this.resultContainer.innerHTML = '';

        for (let file of files) {
            await this.processFile(file);
        }
    }

    async processFile(file) {
        const progressDiv = this.createProgressBar(file.name);
        
        try {
            const pdf = await this.loadPDF(file);
            const extractedText = await this.extractPDFText(pdf, progressDiv);
            this.displayResult(file.name, extractedText);
        } catch (error) {
            progressDiv.innerHTML = `Error processing ${file.name}: ${error.message}`;
            progressDiv.classList.add('text-danger');
        }
    }

    async loadPDF(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const typedArray = new Uint8Array(e.target.result);
                pdfjsLib.getDocument(typedArray).promise
                    .then(resolve)
                    .catch(reject);
            };
            fileReader.readAsArrayBuffer(file);
        });
    }

    async extractPDFText(pdf, progressDiv) {
        const numPages = pdf.numPages;
        const extractedPages = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageData = canvas.toDataURL('image/png');
            
            progressDiv.innerHTML = `Processing page ${pageNum} of ${numPages}`;
            
            const result = await Tesseract.recognize(
                imageData,
                'eng',
                { 
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            progressDiv.innerHTML = `OCR Progress: ${Math.round(m.progress * 100)}%`;
                        }
                    }
                }
            );

            extractedPages.push({
                pageNumber: pageNum,
                text: result.data.text
            });
        }

        return extractedPages;
    }

    createProgressBar(fileName) {
        const progressDiv = document.createElement('div');
        progressDiv.classList.add('alert', 'alert-info');
        progressDiv.innerHTML = `Processing ${fileName}...`;
        this.progressContainer.appendChild(progressDiv);
        return progressDiv;
    }

    displayResult(fileName, extractedPages) {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('card', 'mb-3');
        
        const cardHeader = document.createElement('div');
        cardHeader.classList.add('card-header');
        cardHeader.textContent = fileName;
        resultDiv.appendChild(cardHeader);

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');
        
        extractedPages.forEach(page => {
            const pageSection = document.createElement('div');
            pageSection.innerHTML = `
                <h5>Page ${page.pageNumber}</h5>
                <pre>${page.text}</pre>
            `;
            cardBody.appendChild(pageSection);
        });

        resultDiv.appendChild(cardBody);
        this.resultContainer.appendChild(resultDiv);

        // Optional: Create download button for extracted text
        const downloadBtn = document.createElement('button');
        downloadBtn.classList.add('btn', 'btn-success', 'mt-2');
        downloadBtn.textContent = 'Download Text';
        downloadBtn.addEventListener('click', () => this.downloadText(fileName, extractedPages));
        resultDiv.appendChild(downloadBtn);
    }

    downloadText(fileName, extractedPages) {
        const textContent = extractedPages
            .map(page => `--- Page ${page.pageNumber} ---\n${page.text}\n`)
            .join('\n');
        
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace('.pdf', '')}_ocr_text.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PDFOCRConverter();
});