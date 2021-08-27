"""
	PARA UTILIZAR DIGITE NO TERMINAL
	'python verificar_xmls_autorizadas.py'
	E SIGA AS INSTRUCOES PRESENTES NA TELA
"""

import os, glob, shutil
from dataclasses import dataclass
from datetime import datetime, timezone


MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO',
         'ABRIL', 'MAIO', 'JUNHO',
         'JULHO', 'AGOSTO', 'SETEMBRO',
         'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']

NFCes = {}

def get_tag_values(string: str, tag: str, search_all: bool = False) -> list[str]:
	values = []
	tag_end = 0
	i = 0
	while tag_end < len(string):
		try:
			tag_attrb_start = string.index('<'+tag, tag_end)
			tag_attrb_end = string.index('>', tag_attrb_start)+1
			tag_end = string.index('</'+tag+'>', tag_attrb_end)
			values.append(string[tag_attrb_end: tag_end])
			if not search_all:
				return values
		except ValueError:
			return values

@dataclass
class NFCEXML:

	razao: str
	cnpj: str
	numero: int
	serie: int
	emissao: datetime
	transmissao: datetime
	total: float
	autorizada: bool
	xmlpath: str

	def __init__(self, xmlpath):
		self.xmlpath = xmlpath
		with open(xmlpath, 'r') as f:
			xmlstring = ''.join(f.readlines())
		self.razao = get_tag_values(xmlstring, 'xNome')[0]
		self.cnpj = get_tag_values(xmlstring, 'CNPJ')[0]
		self.numero = int(get_tag_values(xmlstring, 'nNF')[0])
		self.serie = int(get_tag_values(xmlstring, 'serie')[0])
		self.emissao = datetime.fromisoformat(get_tag_values(xmlstring, 'dhEmi')[0])
		self.total = float(get_tag_values(get_tag_values(xmlstring, 'total')[0], 'vNF')[0])
		try:
			xmlstring.index('Autorizado o uso da NF-e')
			self.transmissao = datetime.fromisoformat(get_tag_values(xmlstring, 'dhRecbto')[0])
			self.autorizada = True
		except ValueError:
			self.transmissao = None
			self.autorizada = False

	def __eq__(self, other):
		try:
			return other and self.cnpj == other.cnpj and\
							 self.numero == other.numero and\
							 self.serie == other.serie and\
							 self.total == other.total
		except:
			return False

	def __hash__(self):
		return (self.cnpj, self.numero, self.serie, self.total).__hash__()

def _soma(nfces: list) -> float: 
	s = 0;
	for nfce in nfces: s += nfce.total
	return s

def _autor_nao_autor(nfces: list) -> list:
	autorizadas = []
	nao_autorizadas = []
	for nfce in nfces:
		if nfce.autorizada and nfce not in autorizadas:
			autorizadas.append(nfce)
		elif nfce not in autorizadas:
			nao_autorizadas.append(nfce)
	return autorizadas, nao_autorizadas

def _sep_mes(nfces: list) -> dict:
	nfces.sort(key=lambda a: a.transmissao if a.transmissao else a.emissao)
	meses = {}
	for nfce in nfces:
		mes = nfce.transmissao.month if nfce.transmissao else nfce.emissao.month
		ano = nfce.transmissao.year if nfce.transmissao else nfce.emissao.year
		dt_string = '{}{}'.format(MESES[mes-1],ano)
		if dt_string not in meses:
			meses[dt_string] = [nfce]
		else:
			meses[dt_string].append(nfce)
	return meses

def _tabela(nfces: list) -> None:
	n_campos = ('NUMERO', 'SERIE', 'EMISSAO', 'TRANSMISSAO', 'TOTAL', 'AUTOR', 'ARQUIVO')
	t_campos = '{:^8}{:^5}{:^11}{:^11} R${:>7}{:^7} {:<50}'
	dt_format = '%d/%m/%Y'
	width = len(t_campos.format(*n_campos))
	print('┈'*width)
	print(t_campos.format(*n_campos))
	print('┈'*width)
	nfces.sort(key=lambda nfce: nfce.serie)
	for nfce in nfces:
		print(t_campos.format(nfce.numero, nfce.serie, nfce.emissao.strftime(dt_format),
							  nfce.transmissao.strftime(dt_format) if nfce.transmissao else '',
							  nfce.total, 'SIM' if nfce.autorizada else 'NAO', os.path.basename(nfce.xmlpath)))
	print(('{:┈^'+str(width)+'}').format(' {} ARQUIVOS, R$ {:.2f} '.format(len(nfces), _soma(nfces))))

def _copiar_xmls(nfces: list, path: str) -> None:
	print("Salvando xmls "+path)
	if os.path.exists(path):
		shutil.rmtree(path)
	os.makedirs(path)
	for nfce in nfces:
		try:
			mes = nfce.transmissao.month
			ano = nfce.transmissao.year
		except AttributeError:
			mes = nfce.emissao.month
			ano = nfce.emissao.year
		final_path = os.path.join(path, '{}{}'.format(MESES[mes-1], ano))
		if not os.path.exists(final_path):
			os.makedirs(final_path)
		shutil.copyfile(nfce.xmlpath, os.path.join(final_path, os.path.basename(nfce.xmlpath)))
	
def F_relatorio() -> dict:
	for k, v in NFCes.items():
		print('\n\n   '+v[0].razao)
		a, n = _autor_nao_autor(v)
		nfces_mes = _sep_mes(a+n)
		for k, v in nfces_mes.items():
			a, n = _autor_nao_autor(v)
			print('\n{}'.format(k))
			print("{:<5} XMLs autorizadas       R${:>9.2f}".format(len(a), _soma(a)))
			print("{:<5} XMLs NAO autorizadas   R${:>9.2f}".format(len(n), _soma(n)))

def F_relatorio_detalhes() -> None:
	for k, v in NFCes.items():
		print('')
		a, n = _autor_nao_autor(v)
		nfces_mes = _sep_mes(a+n)
		for k, v in nfces_mes.items():
			_, n = _autor_nao_autor(v)
			print('\n  {} {} {}'.format('XMLS NAO AUTORIZADAS', k, v[0].razao))
			_tabela(n)

def F_copiar_xmls() -> None:
	for k, v in NFCes.items():
		a, b = _autor_nao_autor(v)
		if len(a) > 0:
			path = os.path.join(a[0].razao, 'autorizadas')
			_copiar_xmls(a, path)
		if len(b) > 0:
			path = os.path.join(b[0].razao, 'nao_autorizadas')
			_copiar_xmls(b, path)

def F_marcar_xmls_nao_autorizadas_como_nao_enviadas_no_pdv() -> None:
	print('\n')
	try:
		import psycopg2
	except ModuleNotFoundError:
		os.system('pip install psycopg2')
		import psycopg2

	# CONNECTA COM A BASE DE DADOS
	print('Conectando ao banco de dados do pdv')
	try:
		con = psycopg2.connect(
		    host='localhost',
		    database='gestorpdv',
		    user='postgres',
		    password='orple'
		)

		# SELECIONA A EMPRESA PRESENTE NO PDV
		with con.cursor() as cur:
			cur.execute("SELECT cnpj, razao_social FROM ecf_empresa")
			pdv_cnpj, pdv_razao = cur.fetchone()
		print("Banco de dados do PDV encontrado")
		print('RAZAO SOCIAL: {}, CNPJ: {}'.format(pdv_razao, pdv_cnpj))

	except psycopg2.OperationalError as e:
		print('ERRO: Nao foi possivel connectar a base de dados do pdv')
		con.close()
		return

	# SELECIONA O NUMERO DE TODAS AS VENDAS NÃO TRANSMITIDAS
	with con.cursor() as cur:
		cur.execute("SELECT coo, serie_nfce_sat, total_documento FROM ecf_venda_cabecalho WHERE cupom_cancelado='N' AND modelo_cupom='65'")
		res = cur.fetchall()
	pdv_nfces = []
	for nfce in res:
		try:
			numero = int(nfce[0])
			serie = int(nfce[1])
			total = float(nfce[2])
			pdv_nfces.append((numero, serie, total))
		except TypeError:
			print("Error ao ler o cupom {} serie {}".format(numero, serie))
	for k, v in NFCes.items():
		_, b = _autor_nao_autor(v)
		if len(b) > 0 and b[0].cnpj == pdv_cnpj:
			for nfce in b:
				try:
					with con.cursor() as cur:
						cur.execute('UPDATE ecf_venda_cabecalho SET protocolo=NULL, cstat=0 WHERE coo=%s AND serie_nfce_sat=\'%s\'', (nfce.numero, nfce.serie))
					if cur.rowcount == 1:
						con.commit()
						print('status da NFC-e {}, {} alterado para \'Aguardando Envio\''.format(nfce.numero, nfce.serie))
					else:
						print("Erro ao alterar status da NFC-e: "+str(nfce))
				except Exception as e:
					print("Erro ao alterar status da NFC-e: "+str(nfce))
					print(e)
		else:
			continue





def main():
	global NFCes

	path = os.path.abspath(os.path.normpath(input('\n\tCaminho das xmls: ')))
	if not os.path.exists(path):
		print('\n\tCaminho \'{}\' nao encontrado.'.format(path))
		return

	xmlpaths = glob.glob(os.path.join(path,'*.xml'))
	print("\n\t{} arquivos encontrados".format(len(xmlpaths)))

	for i, xmlpath in enumerate(xmlpaths):
		print('Processando {:.2f}%'.format(i/len(xmlpaths)*100))
		try:
			nfce = NFCEXML(xmlpath)
		except:
			print("XML invalida: "+os.path.basename(xmlpath))
			continue
		if nfce.cnpj in NFCes:
			NFCes[nfce.cnpj].append(nfce)
		else:
			NFCes[nfce.cnpj] = [nfce]

	F_relatorio()
	while True:
		res = input('\n\n'+
			' 1 - RESUMO\n'+
			' 2 - LISTAR NAO AUTORIZADAS\n'+
			' 3 - SALVAR XMLs\n'+
			' 4 - ALTERAR STATUS DAS XMLS NAO AUTORIZADAS PARA AGUARDANDO ENVIO NO PDV\n'+
			' 0 - SAIR\n\n'+
			'Digite uma opcao: ')
		print('\n')
		try:
			res = int(res)
			if res == 0:
				exit()
			elif res == 1:
				F_relatorio()
			elif res == 2:
				F_relatorio_detalhes()
			elif res == 3:
				F_copiar_xmls()
			elif res == 4:
				F_marcar_xmls_nao_autorizadas_como_nao_enviadas_no_pdv()
			else:
				raise ValueError()
		except ValueError:
			print('Opcao invalida.')


if __name__=='__main__':
	main()
