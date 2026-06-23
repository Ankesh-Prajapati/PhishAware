(function () {
  'use strict';
  document.addEventListener('pa:ready', renderPage);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  function renderPage() {
    const content = document.getElementById('appContent');
    const eligibility = PACertificateEligibility();
    content.innerHTML = `<div class="certificate-shell"><div class="certificate-page-heading d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4"><div><div class="page-eyebrow">Achievement</div><h1 class="page-title">Certificate of completion</h1><p class="text-muted mb-0">Awarded after all ${eligibility.total} phishing assessments are complete with an overall score of at least ${eligibility.threshold}%.</p></div><a href="report.html" class="btn btn-soft"><i class="bi bi-file-earmark-bar-graph me-1"></i>View report</a></div><div id="certificateContent"></div></div>`;
    if (eligibility.certificate) renderCertificate(eligibility.certificate, eligibility);
    else if (eligibility.eligible) renderIssuanceForm(eligibility);
    else renderLocked(eligibility);
  }

  function renderLocked(eligibility) {
    const target = document.getElementById('certificateContent');
    const progress = Math.round(eligibility.completedCount / Math.max(1, eligibility.total) * 100);
    target.innerHTML = `<div class="card certificate-lock p-4 p-lg-5"><div class="row align-items-center g-4"><div class="col-md-auto"><div class="certificate-progress-ring" style="--certificate-progress:${progress * 3.6}deg"><strong>${eligibility.completedCount}/${eligibility.total}</strong></div></div><div class="col"><span class="badge text-bg-secondary mb-2"><i class="bi bi-lock-fill me-1"></i>Locked</span><h2 class="h4">Complete the full assessment to unlock</h2><p class="text-muted">You need all ${eligibility.total} simulation categories completed and an aggregate score of ${eligibility.threshold}% or higher. Current completed-category average: <strong>${eligibility.overallScore}%</strong>.</p><a href="simulations.html" class="btn btn-primary">Continue assessment <i class="bi bi-arrow-right ms-1"></i></a></div></div><hr class="my-4"><div class="table-responsive"><table class="table eligibility-table mb-0"><thead><tr><th>Simulation</th><th>Status</th><th>Current score</th></tr></thead><tbody>${eligibility.results.map(item => `<tr><td>${item.title}</td><td><span class="badge ${item.complete ? 'text-bg-success' : 'text-bg-secondary'}">${item.complete ? 'Complete' : 'Required'}</span></td><td>${item.complete ? `${item.score}%` : '-'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function renderIssuanceForm(eligibility, isReissue = false) {
    const target = document.getElementById('certificateContent');
    target.innerHTML = `<div class="card recipient-form p-4 p-lg-5 text-center"><div class="scenario-icon mx-auto"><i class="bi bi-award"></i></div><span class="badge text-bg-success mt-3 mb-2">Certificate unlocked</span><h2 class="h4">${eligibility.overallScore}% overall assessment score</h2><p class="text-muted">Enter the recipient name exactly as it should appear on the certificate. This name and certificate record remain in this browser.</p><form id="recipientForm" class="text-start mt-4"><label for="recipientName" class="form-label fw-semibold">Recipient full name</label><input id="recipientName" name="recipientName" class="form-control form-control-lg" maxlength="80" autocomplete="name" required placeholder="Enter full name"><div class="form-text">Use 2-80 characters. You can reissue the certificate later while eligible.</div><div class="d-flex justify-content-center gap-2 mt-4">${isReissue ? '<button type="button" class="btn btn-soft" id="cancelReissue">Cancel</button>' : ''}<button type="submit" class="btn btn-primary"><i class="bi bi-patch-check me-1"></i>Issue certificate</button></div></form></div>`;
    document.getElementById('recipientForm').addEventListener('submit', event => {
      event.preventDefault();
      const name = new FormData(event.currentTarget).get('recipientName').trim();
      if (name.length < 2) { PAToast('Enter a valid recipient name.'); return; }
      PGStorage.issueCertificate(name, eligibility.overallScore);
      PAToast('Certificate issued and saved locally.');
      renderPage();
    });
    document.getElementById('cancelReissue')?.addEventListener('click', renderPage);
  }

  function renderCertificate(certificate, eligibility) {
    const target = document.getElementById('certificateContent');
    const recipient = escapeHtml(certificate.recipientName);
    target.innerHTML = `<div class="certificate-status-note alert alert-success d-flex align-items-center gap-2"><i class="bi bi-patch-check-fill fs-4"></i><div><strong>Certificate issued</strong><div class="small">The passing requirement was satisfied across the complete phishing assessment.</div></div></div><article class="certificate-paper" id="certificatePaper"><div class="certificate-seal"><i class="bi bi-shield-check"></i></div><div class="certificate-eyebrow">Certificate of Completion</div><h1>Phishing Awareness<br>Training</h1><p class="certificate-statement">This is to certify that the following individual has successfully completed the PhishAware security awareness assessment across every phishing, fraud, and social-engineering category in this program, demonstrating knowledge at or above the required passing standard of ${eligibility.threshold}%.</p><div class="certificate-awarded">Awarded to</div><div class="certificate-name">${recipient}</div><div class="certificate-divider"></div><div class="certificate-details"><div><div class="certificate-label">Overall score</div><div class="certificate-value">${certificate.score}/100 (${certificate.score}%)</div></div><div><div class="certificate-label">Date issued</div><div class="certificate-value">${formatDate(certificate.issuedAt)}</div></div><div><div class="certificate-label">Course code</div><div class="certificate-value">${escapeHtml(certificate.courseCode)}</div></div><div><div class="certificate-label">Issued by</div><div class="certificate-value certificate-signature">PhishAware</div></div></div><div class="certificate-id"><div class="certificate-label">Certificate ID</div><div class="certificate-value">${escapeHtml(certificate.certificateId)}</div></div><div class="certificate-footnote">This certificate is generated and stored locally in the learner's browser. No public verification service is used.</div></article><div class="certificate-actions no-print"><button type="button" class="btn btn-primary" id="downloadCertificate"><i class="bi bi-file-earmark-pdf me-1"></i>Download PDF</button><button type="button" class="btn btn-soft" id="printCertificate"><i class="bi bi-printer me-1"></i>Print</button>${eligibility.eligible ? '<button type="button" class="btn btn-soft" id="reissueCertificate"><i class="bi bi-person-gear me-1"></i>Change recipient</button>' : ''}</div>`;
    document.getElementById('downloadCertificate').addEventListener('click', () => downloadPdf(certificate, eligibility.threshold));
    document.getElementById('printCertificate').addEventListener('click', () => window.print());
    document.getElementById('reissueCertificate')?.addEventListener('click', () => renderIssuanceForm(eligibility, true));
  }

  function downloadPdf(certificate, threshold) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setDrawColor(23, 52, 95); doc.setLineWidth(1.2); doc.roundedRect(5, 5, 287, 200, 4, 4, 'S');
    doc.setFillColor(23, 52, 95); doc.rect(6, 6, 285, 3, 'F'); doc.setFillColor(6, 167, 181); doc.rect(150, 6, 141, 3, 'F');
    doc.setTextColor(8, 125, 140); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('C E R T I F I C A T E   O F   C O M P L E T I O N', 148.5, 34, { align: 'center' });
    doc.setTextColor(24, 43, 79); doc.setFont('times', 'bold'); doc.setFontSize(28); doc.text('Phishing Awareness Training', 148.5, 52, { align: 'center' });
    doc.setTextColor(75, 85, 99); doc.setFont('helvetica', 'normal'); doc.setFontSize(11); const statement = `This certifies successful completion of the complete PhishAware assessment across all phishing threat categories at or above the required passing standard of ${threshold}%.`; doc.text(doc.splitTextToSize(statement, 190), 148.5, 67, { align: 'center' });
    doc.setTextColor(139, 149, 165); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('A W A R D E D   T O', 148.5, 91, { align: 'center' });
    doc.setTextColor(23, 52, 95); doc.setFont('times', 'bold'); doc.setFontSize(25); doc.text(certificate.recipientName, 148.5, 107, { align: 'center', maxWidth: 190 });
    doc.setDrawColor(14, 165, 179); doc.setLineWidth(.8); doc.line(95, 112, 202, 112);
    doc.setDrawColor(220, 224, 231); doc.setLineWidth(.3); doc.line(30, 128, 267, 128);
    doc.setTextColor(139, 149, 165); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('OVERALL SCORE', 75, 143, { align: 'center' }); doc.text('DATE ISSUED', 222, 143, { align: 'center' });
    doc.setTextColor(23, 52, 95); doc.setFontSize(11); doc.text(`${certificate.score}/100 (${certificate.score}%)`, 75, 153, { align: 'center' }); doc.text(formatDate(certificate.issuedAt), 222, 153, { align: 'center' });
    doc.setTextColor(139, 149, 165); doc.setFontSize(8); doc.text('COURSE CODE', 75, 168, { align: 'center' }); doc.text('ISSUED BY', 222, 168, { align: 'center' });
    doc.setTextColor(23, 52, 95); doc.setFontSize(11); doc.text(certificate.courseCode, 75, 178, { align: 'center' }); doc.setFont('times', 'italic'); doc.text('PhishAware', 222, 178, { align: 'center' });
    doc.setTextColor(8, 125, 140); doc.setFont('courier', 'bold'); doc.setFontSize(8); doc.text(certificate.certificateId, 148.5, 191, { align: 'center' });
    doc.setTextColor(145); doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.text('Generated and stored locally in the learner browser.', 148.5, 199, { align: 'center' });
    doc.save(`phishaware-certificate-${certificate.recipientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`);
    PAToast('Certificate PDF downloaded.');
  }
})();
