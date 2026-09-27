/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ShiftReport, Transaction } from '../types';
import { formatDate, formatTime, formatDateTime, formatCurrency } from './dateFormatter';

/**
 * Exports a specific HTML DOM element directly to a high-resolution PDF file fitting standard A4.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string = 'تقرير_الوردية_المعتمد.pdf',
  onProgress?: (status: string) => void
): Promise<void> {
  try {
    if (onProgress) onProgress('جاري معالجة وتجهيز صفحات التقرير...');

    // High resolution canvas capture at 2x scale
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    if (onProgress) onProgress('جاري إنشاء ملف PDF وتنسيق الهوامش القياسية (A4)...');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Standard A4 dimensions in mm (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8; // 8mm margin
    const contentWidth = pageWidth - (margin * 2);
    
    // Calculate scaled height based on aspect ratio
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight);
    heightLeft -= (pageHeight - (margin * 2));

    // Subsequent pages only if content overflows single A4 page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight);
      heightLeft -= (pageHeight - (margin * 2));
    }

    if (onProgress) onProgress('تم إنشاء الملف، جاري التنزيل...');
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Builds a hidden, styled printable DOM container and exports it directly to PDF.
 * This allows exporting any report without needing to open the modal first.
 */
export async function exportReportDataToPdf(
  report: ShiftReport,
  transactions: Transaction[]
): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px'; // Standard A4 pixel width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Cairo', system-ui, -apple-system, sans-serif";
  container.style.direction = 'rtl';
  container.style.padding = '32px 36px';
  container.style.boxSizing = 'border-box';

  const incomeTxs = transactions.filter(t => t.type === 'income');
  const expenseTxs = transactions.filter(t => t.type === 'expense');

  const totalIncomes = incomeTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpenses = expenseTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const baseBalance = report.carriedBalanceFromPrevious != null 
    ? Number(report.carriedBalanceFromPrevious) 
    : Number(report.todayIncome || 0);
  const netBalance = report.netBalance != null 
    ? report.netBalance 
    : (baseBalance + totalIncomes - totalExpenses);

  const isConsolidated = report.shiftType === 'general' || report.reportNumber.includes('DAILY-ALL');
  const shiftLabel = isConsolidated
    ? 'تقرير اليوم الشامل'
    : report.shiftType === 'morning'
      ? 'الوردية الصباحية'
      : report.shiftType === 'evening'
        ? 'الوردية المسائية'
        : 'وردية عامة';

  const paymentLabels: Record<string, string> = {
    cash: 'نقدي (كاش)',
    card: 'شبكة (مدى)',
    transfer: 'تحويل بنكي',
    other: 'أخرى',
  };

  container.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 2px;">نظام إدارة الورديات والميزانية اليومية</div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a;">${isConsolidated ? 'كشف حركة الصندوق والتقرير اليومي الشامل' : 'تقرير تسليم الوردية المعتمد'}</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">سجل محاسبي رسمي موثق لحركة النقدية وتصفية العهدة المالية</p>
        </div>
        <div style="text-align: left; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; min-width: 170px; font-size: 11px;">
          <div style="color: #64748b; font-size: 10px;">رقم التقرير:</div>
          <div style="font-family: monospace; font-weight: bold; color: #0f172a;">${report.reportNumber}</div>
          <div style="border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 4px; display: flex; justify-content: space-between;">
            <span>التاريخ: ${formatDate(report.date)}</span>
            <strong style="color: #0f172a;">${shiftLabel}</strong>
          </div>
          ${(report.status === 'submitted' || report.status === 'archived' || report.handover) ? `
            <div style="margin-top: 4px; background-color: #ecfdf5; color: #047857; font-weight: bold; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-align: center;">
              معتمد ومؤرشف
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Metadata Strip -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; padding: 8px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px;">
        <div><span style="color: #64748b; display: block; font-size: 10px;">المسؤول / أمين الصندوق:</span><strong>${report.employeeName}</strong></div>
        <div><span style="color: #64748b; display: block; font-size: 10px;">الوردية / الفترة:</span><strong>${shiftLabel}</strong></div>
        <div><span style="color: #64748b; display: block; font-size: 10px;">المستلم / المدقق:</span><strong>${report.handover?.handedOverToName || '—'}</strong></div>
        <div><span style="color: #64748b; display: block; font-size: 10px;">توقيت الاعتماد:</span><strong style="font-family: monospace;">${report.handover?.handedOverAt ? formatDateTime(report.handover.handedOverAt) : formatDateTime(report.createdAt)}</strong></div>
      </div>
    </div>

    <!-- Unified Financial Ribbon (Zero Redundancy) -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; text-align: center;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 8px;">
        <span style="font-size: 10px; color: #64748b; font-weight: bold; display: block; margin-bottom: 2px;">دخل اليوم الأساسي (الحوباني)</span>
        <div style="font-family: monospace; font-size: 15px; font-weight: 900; color: #0f172a;">${formatCurrency(baseBalance)} <span style="font-size: 10px; font-weight: normal; color: #64748b;">ر.س</span></div>
      </div>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 8px;">
        <span style="font-size: 10px; color: #166534; font-weight: bold; display: block; margin-bottom: 2px;">(+) إجمالي المقبوضات (${incomeTxs.length})</span>
        <div style="font-family: monospace; font-size: 15px; font-weight: 900; color: #047857;">+${formatCurrency(totalIncomes)} <span style="font-size: 10px; font-weight: normal; color: #166534;">ر.س</span></div>
      </div>

      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 10px 8px;">
        <span style="font-size: 10px; color: #9f1239; font-weight: bold; display: block; margin-bottom: 2px;">(-) إجمالي المصروفات (${expenseTxs.length})</span>
        <div style="font-family: monospace; font-size: 15px; font-weight: 900; color: #be123c;">-${formatCurrency(totalExpenses)} <span style="font-size: 10px; font-weight: normal; color: #9f1239;">ر.س</span></div>
      </div>

      <div style="background-color: #f0f9ff; border: 2px solid #38bdf8; border-radius: 8px; padding: 10px 8px;">
        <span style="font-size: 10px; color: #0369a1; font-weight: 900; display: block; margin-bottom: 2px;">(=) الصافي (الرصيد الفعلي في الصندوق)</span>
        <div style="font-family: monospace; font-size: 15px; font-weight: 900; color: #0c4a6e;">${formatCurrency(netBalance)} <span style="font-size: 10px; font-weight: normal; color: #0369a1;">ر.س</span></div>
      </div>
    </div>

    <!-- Transactions Ledger Table -->
    <div style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 11px; font-weight: bold; color: #334155;">
        <span>كشف الحركات المالية للوردية (${transactions.length} حركة)</span>
        <span style="color: #94a3b8; font-weight: normal; font-size: 10px;">المبالغ بالعملة المحلية (ر.س)</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: right; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 6px 8px; width: 24px; text-align: center;">#</th>
            <th style="padding: 6px 8px;">البيان والتفاصيل</th>
            <th style="padding: 6px 8px; width: 110px;">التصنيف</th>
            <th style="padding: 6px 8px; width: 90px;">وسيلة الدفع</th>
            <th style="padding: 6px 8px; width: 70px; text-align: center;">الوقت</th>
            <th style="padding: 6px 8px; width: 90px; text-align: left;">المبلغ (ر.س)</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.length === 0 ? `
            <tr><td colspan="6" style="padding: 18px; text-align: center; color: #94a3b8; font-style: italic;">لا توجد حركات نقدية إضافية مسجلة خلال هذه الوردية، والصافي يطابق العهدة الافتتاحية.</td></tr>
          ` : transactions.map((t, idx) => {
            const isInc = t.type === 'income';
            return `
              <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 5px 8px; text-align: center; font-family: monospace; color: #94a3b8; font-size: 10px;">${idx + 1}</td>
                <td style="padding: 5px 8px;">
                  <div style="font-weight: 600; color: #0f172a;">${t.description}</div>
                  ${t.createdByName && t.createdByName !== report.employeeName ? `<div style="font-size: 9px; color: #64748b;">سُجّلت بواسطة: ${t.createdByName}</div>` : ''}
                </td>
                <td style="padding: 5px 8px; color: #475569;">${t.categoryName}</td>
                <td style="padding: 5px 8px; color: #475569;">${paymentLabels[t.paymentMethod] || t.paymentMethod}</td>
                <td style="padding: 5px 8px; text-align: center; font-family: monospace; color: #64748b; font-size: 10px;">${formatTime(t.timestamp)}</td>
                <td style="padding: 5px 8px; text-align: left; font-family: monospace; font-weight: bold; color: ${isInc ? '#047857' : '#be123c'}; font-size: 11px;">
                  ${isInc ? '+' : '-'}${formatCurrency(t.amount)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        ${transactions.length > 0 ? `
          <tfoot>
            <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: bold; font-size: 10px;">
              <td colspan="2" style="padding: 6px 8px; color: #0f172a;">إجمالي حركات الوردية: ${transactions.length}</td>
              <td colspan="2" style="padding: 6px 8px; color: #475569; text-align: left;">
                مقبوضات: <strong style="color: #047857; font-family: monospace;">+${formatCurrency(totalIncomes)}</strong> | مصروفات: <strong style="color: #be123c; font-family: monospace;">-${formatCurrency(totalExpenses)}</strong>
              </td>
              <td style="padding: 6px 8px; text-align: center; color: #64748b;">الصافي:</td>
              <td style="padding: 6px 8px; text-align: left; font-family: monospace; font-weight: 900; color: #0c4a6e; font-size: 11px;">
                ${formatCurrency(totalIncomes - totalExpenses)} ر.س
              </td>
            </tr>
          </tfoot>
        ` : ''}
      </table>
    </div>

    <!-- Handover Certification Protocol (If Handed Over) -->
    ${report.handover ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; font-weight: bold; color: #0f172a;">
          <span>محضر تسليم الوردية المعتمد رقمياً (Handover Protocol)</span>
          <span style="font-family: monospace; font-size: 10px; color: #64748b;">${formatDateTime(report.handover.handedOverAt)}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <div><span style="color: #64748b; font-size: 10px; display: block;">الموظف المسلّم:</span><strong>${report.handover.handedOverByName}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; display: block;">الموظف المستلم:</span><strong>${report.handover.handedOverToName}</strong></div>
          <div><span style="color: #64748b; font-size: 10px; display: block;">الصافي المسلّم:</span><strong style="color: #047857; font-family: monospace;">${formatCurrency(report.netBalance)} ر.س</strong></div>
        </div>
        ${report.handover.handoverNotes ? `
          <div style="margin-top: 6px; padding: 6px 8px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 10px; color: #334155;">
            <strong style="color: #0f172a;">ملاحظات التسليم:</strong> ${report.handover.handoverNotes}
          </div>
        ` : ''}
      </div>
    ` : ''}

    <!-- Official 3-Party Signatures -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding-top: 14px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 10.5px;">
      <div>
        <div style="font-weight: bold; color: #0f172a;">أمين الصندوق (المسلّم)</div>
        <div style="color: #64748b; font-size: 10px; margin-top: 2px;">${report.employeeName}</div>
        <div style="margin-top: 26px; border-top: 1px dashed #94a3b8; font-size: 9px; color: #94a3b8; padding-top: 2px;">التوقيع: ............................</div>
      </div>
      <div>
        <div style="font-weight: bold; color: #0f172a;">المستلم / المدقق</div>
        <div style="color: #64748b; font-size: 10px; margin-top: 2px;">${report.handover?.handedOverToName || '....................'}</div>
        <div style="margin-top: 26px; border-top: 1px dashed #94a3b8; font-size: 9px; color: #94a3b8; padding-top: 2px;">التوقيع: ............................</div>
      </div>
      <div>
        <div style="font-weight: bold; color: #0f172a;">اعتماد إدارة الفرع</div>
        <div style="color: #64748b; font-size: 10px; margin-top: 2px;">المصادقة والختم الرسمي</div>
        <div style="margin-top: 26px; border-top: 1px dashed #94a3b8; font-size: 9px; color: #94a3b8; padding-top: 2px;">الختم: ............................</div>
      </div>
    </div>

    <!-- Security & Archival Footer -->
    <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
      <span>وثيقة نظامية رسمية معتمدة ومؤرشفة غير قابلة للتعديل - صادرة عبر نظام إدارة الورديات والميزانية اليومية</span>
      <span>تاريخ الطباعة: ${formatDateTime(new Date())}</span>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const filename = `تقرير_الوردية_${report.reportNumber}_${report.date}.pdf`;
    await exportElementToPdf(container, filename);
  } finally {
    document.body.removeChild(container);
  }
}
