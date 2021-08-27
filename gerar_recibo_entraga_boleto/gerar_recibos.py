import os, glob, subprocess
from datetime import date

try:
	import PyPDF2, pdfkit
except ModuleNotFoundError:
	os.system('pip install PyPDF2')
	os.system('pip install pdfkit')
	import pdfkit
	import PyPDF2
from PyPDF2 import PdfFileReader
from pdfkit.configuration import Configuration
pdfkit_config=None
options = {'page-size':'A4', 'dpi':400, 'disable-smart-shrinking': ''}
if subprocess.run(['where','wkhtmltopdf'], capture_output=True).returncode == 1:
	wkhtmltopdf = os.path.abspath('./lib/wkhtmltopdf/bin/wkhtmltopdf.exe')
	pdfkit_config = Configuration(wkhtmltopdf)

html_head="""
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
body{
    font-family: arial;
    text-align: center;
}
.comprovante {
    margin-top: 0.5cm;
    margin-bottom: 0.5cm;
    border-bottom: .4mm dotted;
    padding-bottom: 0.5cm;
}
hr {
    height: 0.5mm;
    background-color: black;
    border: 0; margin: 0;
}
.signature{
    margin: auto;
    margin-top: 1.4cm;
    margin-bottom: .5cm;
    height: .3mm; width: 10cm;
    border-radius: 1em;
}
</style>
</head>
"""
html_page_break = '<div style = "display:block; clear:both; page-break-before:always;"></div>'

def html_recibo(razao_social):
	dt = date.today()
	return """<div class='comprovante'>
             	<hr>
            	<h1>Comprovante de entrega de carnê</h1>
            	<h3>{}</h3>
            	<p>Entrega em {:02}/{:04}</p>
            	<hr class='signature'>
            	<hr>
        	</div>
        """.format(razao_social,dt.month, dt.year)

def pagador(path_boleto: str) -> str:
	pdf = PdfFileReader(path_boleto)
	text = pdf.getPage(0).extractText()
	start_idx = text.index('Pagador')+len('Pagador')
	end_idx = text.index('.', start_idx)-2
	return text[start_idx:end_idx]


def main():

	pasta_boletos = os.path.abspath(os.path.normpath('./boletos'))

	if not os.path.exists(pasta_boletos):
		print('Pasta boletos nao encontrada.')
		return
	path_boletos = glob.glob(os.path.join(pasta_boletos,'*.pdf'))
	html = html_head
	for i, path_boleto in enumerate(path_boletos):
		razao_social = pagador(path_boleto)
		html+=html_recibo(razao_social)
		if i%4==3:
			html+=html_page_break
	pdfkit.from_string(html, 'recibos.pdf', options=options, configuration=pdfkit_config)

if __name__=='__main__':
	main()