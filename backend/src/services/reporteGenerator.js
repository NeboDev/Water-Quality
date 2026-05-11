const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const { pool } = require('../config/postgres');

const BLUE_DARK = '#1F4E79';
const BLUE_MID = '#2E75B6';
const GRAY = '#666666';
const RED = '#C00000';
const GREEN = '#375623';

const Muestra = mongoose.models.Muestra || mongoose.model('Muestra',
    new mongoose.Schema({
        nodo_id: { type: String, required: true },
        mac: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        valores: {
            ph: Number,
            temperatura: Number,
            conductividad: Number,
            turbidez: Number,
            tds: Number
        },
        nota: { type: String, default: '' },
        registrado_por: { type: String, default: 'sistema' }
    })
);


const LIMITES_NOM127 = {
    ph: { min: 6.5, max: 8.5, unidad: '' },
    temperatura: { min: 0, max: 18, unidad: '°C' },
    conductividad: { min: 0, max: 1600, unidad: 'µS/cm' },
    turbidez: { min: 0, max: 5, unidad: 'NTU' },
    tds: { min: 0, max: 1000, unidad: 'mg/L' }
};

function cumpleNorm(parametro, valor) {
    const limite = LIMITES_NOM127[parametro];
    if (!limite || valor === undefined || valor === null) return null;
    return valor >= limite.min && valor <= limite.max;
}


async function generarReporte({ nodo_id, fecha_inicio, fecha_fin, generado_por }) {
    // Obtiene datos del nodo
    const nodoResult = await pool.query(
        'SELECT id, mac, ubicacion, version_fw FROM nodos WHERE id = $1',
        [nodo_id]
    );
    if (nodoResult.rows.length === 0) throw new Error('Nodo no encontrado');
    const nodo = nodoResult.rows[0];

    // Obtiene datos del usuario que genera el reporte
    const usuarioResult = await pool.query(
        'SELECT nombre, email, rol FROM usuarios WHERE id = $1',
        [generado_por]
    );
    const usuario = usuarioResult.rows[0] || { nombre: 'Sistema', email: '', rol: 'sistema' };

    // Obtiene las muestras en el rango de fechas
    const muestras = await Muestra.find({
        nodo_id,
        timestamp: {
            $gte: new Date(fecha_inicio),
            $lte: new Date(fecha_fin)
        }
    }).sort({ timestamp: 1 }).lean();

    // Obtiene alertas del periodo para el nodo
    const alertasResult = await pool.query(
        `SELECT parametro, valor_leido, valor_min, valor_max, resuelta, creado_en
     FROM alertas
     WHERE nodo_id = $1
       AND creado_en >= $2
       AND creado_en <= $3
     ORDER BY creado_en ASC`,
        [nodo_id, fecha_inicio, fecha_fin]
    );
    const alertas = alertasResult.rows;

    // Calcula estadisticas por parametro
    const parametros = ['ph', 'temperatura', 'conductividad', 'turbidez', 'tds'];
    const estadisticas = {};

    for (const param of parametros) {
        const valores = muestras
            .map(m => m.valores?.[param])
            .filter(v => v !== undefined && v !== null);

        if (valores.length === 0) {
            estadisticas[param] = null;
            continue;
        }

        const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
        const min = Math.min(...valores);
        const max = Math.max(...valores);
        const fueraDeRango = valores.filter(v => !cumpleNorm(param, v)).length;

        estadisticas[param] = {
            promedio: parseFloat(promedio.toFixed(4)),
            min: parseFloat(min.toFixed(4)),
            max: parseFloat(max.toFixed(4)),
            total: valores.length,
            fueraDeRango,
            cumple: fueraDeRango === 0
        };
    }

    // Determina si el periodo seleccionado cumple con la NOM
    const cumpleGeneral = Object.values(estadisticas)
        .filter(e => e !== null)
        .every(e => e.cumple);

    // Generar el PDF
    return new Promise((resolve, reject) => {
        const chunks = [];
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - 100;

        // Encabezado
        doc.fontSize(18).fillColor(BLUE_DARK).font('Helvetica-Bold')
            .text('KANAN', 50, 50, { align: 'center' });

        doc.fontSize(11).fillColor(BLUE_MID).font('Helvetica')
            .text('Sistema de Monitoreo de Calidad del Agua', { align: 'center' });

        doc.fontSize(9).fillColor(GRAY)
            .text('Benemérita Universidad Autónoma de Puebla — ICUAP', { align: 'center' });

        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
            .strokeColor(BLUE_MID).lineWidth(1.5).stroke();
        doc.moveDown(0.5);

        // Titulo del reporte
        doc.fontSize(14).fillColor(BLUE_DARK).font('Helvetica-Bold')
            .text('Reporte de Cumplimiento NOM-127-SSA1-2021', { align: 'center' });
        doc.moveDown(0.3);

        // Badge de cumplimiento
        const badgeColor = cumpleGeneral ? GREEN : RED;
        const badgeText = cumpleGeneral ? '✓ CUMPLE NOM-127' : '✗ NO CUMPLE NOM-127';
        doc.fontSize(11).fillColor(badgeColor).font('Helvetica-Bold')
            .text(badgeText, { align: 'center' });
        doc.moveDown(0.8);

        // Informacion del reporte
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
            .strokeColor('#CCCCCC').lineWidth(0.5).stroke();
        doc.moveDown(0.4);

        const infoY = doc.y;
        doc.fontSize(9).fillColor(GRAY).font('Helvetica');

        const col1 = 50;
        const col2 = 310;

        doc.font('Helvetica-Bold').text('Nodo:', col1, infoY);
        doc.font('Helvetica').text(nodo.mac, col1 + 60, infoY);

        doc.font('Helvetica-Bold').text('Ubicación:', col1, doc.y + 2);
        doc.font('Helvetica').text(nodo.ubicacion, col1 + 60, doc.y);

        doc.font('Helvetica-Bold').text('Firmware:', col1, doc.y + 2);
        doc.font('Helvetica').text(nodo.version_fw || 'N/D', col1 + 60, doc.y);

        const fecha_ini_str = new Date(fecha_inicio).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
        const fecha_fin_str = new Date(fecha_fin).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });

        doc.font('Helvetica-Bold').text('Período:', col1, doc.y + 2);
        doc.font('Helvetica').text(`${fecha_ini_str} — ${fecha_fin_str}`, col1 + 60, doc.y);

        doc.font('Helvetica-Bold').text('Muestras analizadas:', col1, doc.y + 2);
        doc.font('Helvetica').text(`${muestras.length}`, col1 + 120, doc.y);

        doc.font('Helvetica-Bold').text('Generado por:', col1, doc.y + 2);
        doc.font('Helvetica').text(`${usuario.nombre} (${usuario.rol})`, col1 + 90, doc.y);

        doc.font('Helvetica-Bold').text('Fecha de emisión:', col1, doc.y + 2);
        doc.font('Helvetica').text(
            new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
            col1 + 105, doc.y
        );

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
            .strokeColor('#CCCCCC').lineWidth(0.5).stroke();
        doc.moveDown(0.6);

        // Tabla de estadisticas por parametro
        doc.fontSize(11).fillColor(BLUE_DARK).font('Helvetica-Bold')
            .text('Resumen estadístico por parámetro');
        doc.moveDown(0.4);

        // Encabezado
        const colWidths = [90, 65, 65, 65, 65, 65, 70];
        const colX = [50, 140, 205, 270, 335, 400, 465];
        const headers = ['Parámetro', 'Promedio', 'Mínimo', 'Máximo', 'Límite min', 'Límite max', 'Cumple'];

        const tableHeaderY = doc.y;
        doc.rect(50, tableHeaderY, pageWidth, 18).fill(BLUE_DARK);

        doc.fontSize(8).fillColor('white').font('Helvetica-Bold');
        headers.forEach((h, i) => {
            doc.text(h, colX[i] + 2, tableHeaderY + 5, { width: colWidths[i] - 4, align: 'center' });
        });

        doc.moveDown(0.1);
        let rowY = tableHeaderY + 20;

        const nombresParametros = {
            ph: 'pH',
            temperatura: 'Temperatura',
            conductividad: 'Conductividad',
            turbidez: 'Turbidez',
            tds: 'TDS'
        };

        parametros.forEach((param, idx) => {
            const est = estadisticas[param];
            const limite = LIMITES_NOM127[param];
            const bgColor = idx % 2 === 0 ? '#F5F5F5' : '#FFFFFF';

            doc.rect(50, rowY, pageWidth, 16).fill(bgColor);

            doc.fontSize(8).fillColor('#333333').font('Helvetica');

            if (est) {
                const cumpleColor = est.cumple ? GREEN : RED;
                const cumpleText = est.cumple ? '✓ Sí' : `✗ No (${est.fueraDeRango})`;

                doc.text(`${nombresParametros[param]} (${limite.unidad})`, colX[0] + 2, rowY + 4, { width: colWidths[0] - 4 });
                doc.text(est.promedio.toString(), colX[1] + 2, rowY + 4, { width: colWidths[1] - 4, align: 'center' });
                doc.text(est.min.toString(), colX[2] + 2, rowY + 4, { width: colWidths[2] - 4, align: 'center' });
                doc.text(est.max.toString(), colX[3] + 2, rowY + 4, { width: colWidths[3] - 4, align: 'center' });
                doc.text(limite.min.toString(), colX[4] + 2, rowY + 4, { width: colWidths[4] - 4, align: 'center' });
                doc.text(limite.max.toString(), colX[5] + 2, rowY + 4, { width: colWidths[5] - 4, align: 'center' });
                doc.fillColor(cumpleColor).font('Helvetica-Bold')
                    .text(cumpleText, colX[6] + 2, rowY + 4, { width: colWidths[6] - 4, align: 'center' });
            } else {
                doc.text(nombresParametros[param], colX[0] + 2, rowY + 4, { width: colWidths[0] - 4 });
                doc.fillColor(GRAY).text('Sin datos', colX[1] + 2, rowY + 4, { width: 300 });
            }

            rowY += 18;
        });

        doc.y = rowY + 8;
        doc.moveDown(0.8);

        // Detalles muestras
        if (muestras.length > 0) {
            doc.fontSize(11).fillColor(BLUE_DARK).font('Helvetica-Bold')
                .text('Detalle de muestras registradas');
            doc.moveDown(0.4);

            const mColWidths = [120, 55, 65, 65, 65, 65];
            const mColX = [50, 170, 225, 290, 355, 420];
            const mHeaders = ['Timestamp', 'pH', 'Temp (°C)', 'Cond (µS/cm)', 'Turb (NTU)', 'TDS (mg/L)'];

            const mHeaderY = doc.y;
            doc.rect(50, mHeaderY, pageWidth, 16).fill(BLUE_MID);
            doc.fontSize(7.5).fillColor('white').font('Helvetica-Bold');
            mHeaders.forEach((h, i) => {
                doc.text(h, mColX[i] + 2, mHeaderY + 4, { width: mColWidths[i] - 4, align: 'center' });
            });

            let mRowY = mHeaderY + 18;

            muestras.forEach((m, idx) => {
                // Pagina nueva si ya no hay espacio
                if (mRowY > doc.page.height - 100) {
                    doc.addPage();
                    mRowY = 50;
                }

                const bgColor = idx % 2 === 0 ? '#F5F5F5' : '#FFFFFF';
                doc.rect(50, mRowY, pageWidth, 14).fill(bgColor);
                doc.fontSize(7).fillColor('#333333').font('Helvetica');

                const ts = new Date(m.timestamp).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
                doc.text(ts, mColX[0] + 2, mRowY + 3, { width: mColWidths[0] - 4 });
                doc.text(m.valores?.ph?.toString() || 'N/D', mColX[1] + 2, mRowY + 3, { width: mColWidths[1] - 4, align: 'center' });
                doc.text(m.valores?.temperatura?.toString() || 'N/D', mColX[2] + 2, mRowY + 3, { width: mColWidths[2] - 4, align: 'center' });
                doc.text(m.valores?.conductividad?.toString() || 'N/D', mColX[3] + 2, mRowY + 3, { width: mColWidths[3] - 4, align: 'center' });
                doc.text(m.valores?.turbidez?.toString() || 'N/D', mColX[4] + 2, mRowY + 3, { width: mColWidths[4] - 4, align: 'center' });
                doc.text(m.valores?.tds?.toString() || 'N/D', mColX[5] + 2, mRowY + 3, { width: mColWidths[5] - 4, align: 'center' });

                mRowY += 16;
            });

            doc.y = mRowY + 8;
            doc.moveDown(0.8);
        }

        // Alertas en el periodo seleccionado
        if (alertas.length > 0) {
            if (doc.y > doc.page.height - 150) doc.addPage();

            doc.fontSize(11).fillColor(BLUE_DARK).font('Helvetica-Bold')
                .text('Alertas registradas en el período');
            doc.moveDown(0.4);

            const aColX = [50, 170, 260, 330, 400, 465];
            const aColWidths = [120, 90, 70, 70, 65, 70];
            const aHeaders = ['Timestamp', 'Parámetro', 'Valor leído', 'Límite max', 'Resuelta', 'Resultado'];

            const aHeaderY = doc.y;
            doc.rect(50, aHeaderY, pageWidth, 16).fill(RED);
            doc.fontSize(7.5).fillColor('white').font('Helvetica-Bold');
            aHeaders.forEach((h, i) => {
                doc.text(h, aColX[i] + 2, aHeaderY + 4, { width: aColWidths[i] - 4, align: 'center' });
            });

            let aRowY = aHeaderY + 18;

            alertas.forEach((a, idx) => {
                if (aRowY > doc.page.height - 80) {
                    doc.addPage();
                    aRowY = 50;
                }

                const bgColor = idx % 2 === 0 ? '#FFF0F0' : '#FFFFFF';
                doc.rect(50, aRowY, pageWidth, 14).fill(bgColor);
                doc.fontSize(7).fillColor('#333333').font('Helvetica');

                const ts = new Date(a.creado_en).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
                const resuelta = a.resuelta ? '✓ Sí' : '✗ No';

                doc.text(ts, aColX[0] + 2, aRowY + 3, { width: aColWidths[0] - 4 });
                doc.text(a.parametro, aColX[1] + 2, aRowY + 3, { width: aColWidths[1] - 4, align: 'center' });
                doc.text(a.valor_leido.toString(), aColX[2] + 2, aRowY + 3, { width: aColWidths[2] - 4, align: 'center' });
                doc.text(a.valor_max.toString(), aColX[3] + 2, aRowY + 3, { width: aColWidths[3] - 4, align: 'center' });
                doc.fillColor(a.resuelta ? GREEN : RED)
                    .text(resuelta, aColX[4] + 2, aRowY + 3, { width: aColWidths[4] - 4, align: 'center' });
                doc.fillColor(RED).font('Helvetica-Bold')
                    .text('FUERA DE NORMA', aColX[5] + 2, aRowY + 3, { width: aColWidths[5] - 4, align: 'center' });

                aRowY += 16;
            });

            doc.y = aRowY + 8;
        }

        // Pie de pagina
        if (doc.y > doc.page.height - 100) doc.addPage();

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
            .strokeColor('#CCCCCC').lineWidth(0.5).stroke();
        doc.moveDown(0.4);

        doc.fontSize(8).fillColor(GRAY).font('Helvetica')
            .text(
                'Este reporte fue generado automáticamente por el sistema Kanan. ' +
                'Los valores presentados corresponden a las muestras registradas en el período indicado ' +
                'y son evaluados conforme a los límites establecidos por la NOM-127-SSA1-2021.',
                { align: 'justify' }
            );

        doc.end();
    });
}

module.exports = { generarReporte };