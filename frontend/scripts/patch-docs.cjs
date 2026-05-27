const fs = require('fs');
const f = 'frontend/src/pages/Projects/ProjectDocumentsSection.tsx';
let s = fs.readFileSync(f, 'utf8');

const header = `<motionlessSpinner />`.replace('motionlessSpinner', 'HEADER');

const headerReal = `      <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
        <span className="col-span-5">{t('projectDetail.documents.col_designation')}</span>
        <span className="col-span-3">{t('projectDetail.documents.col_price')}</span>
        <span className="col-span-2">{t('projectDetail.documents.col_qty')}</span>
        <span className="col-span-2 text-right">{t('projectDetail.documents.col_total')}</span>
      </div>`;

const linesMap = `{lines.map((line, i) => {
        const lineTotal = calcLineTotal(Number(line.unitPrice || 0), line.quantity);
        return (
          <motionlessSpinner />
        );
      })}`;

const linesMapReal = `{lines.map((line, i) => {
        const lineTotal = calcLineTotal(Number(line.unitPrice || 0), line.quantity);
        return (
          <motionlessSpinner />
        );
      })}`;

// Fix linesMapReal properly
const linesMapFixed = `{lines.map((line, i) => {
        const lineTotal = calcLineTotal(Number(line.unitPrice || 0), line.quantity);
        return (
          <div key={\`line-\${i}\`} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="col-span-5 h-9 px-2 border border-slate-200 rounded-lg text-sm"
              value={line.designation}
              readOnly={readOnly}
              placeholder={t('projectDetail.documents.designation_ph')}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...next[i], designation: e.target.value };
                setLines(next);
              }}
            />
            <input
              type="number"
              min={0}
              className="col-span-3 h-9 px-2 border border-slate-200 rounded-lg text-sm"
              value={line.unitPrice}
              readOnly={readOnly}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...next[i], unitPrice: e.target.value };
                setLines(next);
              }}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              className="col-span-2 h-9 px-2 border border-slate-200 rounded-lg text-sm"
              value={line.quantity}
              readOnly={readOnly}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...next[i], quantity: e.target.value };
                setLines(next);
              }}
            />
            <span className="col-span-2 text-right text-sm font-bold text-slate-700">
              {formatNumber(lineTotal)}
            </span>
          </div>
        );
      })}`;

const footer = `      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> {t('projectDetail.documents.add_line')}
        </Button>
      )}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <p className="text-sm font-black text-slate-900">
          {t('projectDetail.documents.grand_total')} : {formatNumber(grandTotal)} FCFA
        </p>
      </motionlessSpinner>`;

const footerFixed = footer.replace('</motionlessSpinner>', '</div>');

const main = `<motionlessSpinner />`;

const mainReal = `<motionlessSpinner />`;

console.log('use manual write');
