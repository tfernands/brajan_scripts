"""
	PARA UTILIZAR BASTA REENVIAR TODOS OS CUPONS NO PDV
	RODAR O SCRIPT DIGITANDO NO CMD 'python corrige_chave_cupom.py'
	E CONSULTAR TODOS OS CUPONS NO PDV NOVAMENTE.
"""

import os, time, glob

try:
	import psycopg2
except ModuleNotFoundError:
	os.system('pip install psycopg2')
	import psycopg2


NOME_MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO',
              'ABRIL', 'MAIO', 'JUNHO',
              'JULHO', 'AGOSTO', 'SETEMBRO',
              'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']


def main():

	# ENCONTRA O DIRETORIO DAS XMLS DE LOGs
	data = time.localtime()
	mes = NOME_MESES[data.tm_mon-1]
	path = os.path.normpath('C:/Brajan/GestorPDV/Fiscal/Log/{}/{}/'
							 .format(data.tm_year, mes+str(data.tm_year)))

	if not os.path.exists(path):
		print('Pasta nao encontrada: '+path)
		return

	# CONNECTA COM A BASE DE DADOS
	print('Conectando ao banco de dados do pdv')
	try:
		con = psycopg2.connect(
		    host='localhost',
		    database='gestorpdv',
		    user='postgres',
		    password='orple'
		)
	except psycopg2.OperationalError as e:
		print('Nao foi possivel connectar a base de dados do pdv')
		return

	# LISTA TODAS AS XMLS E ORDENA POR DATA
	print('Encontrando arquivos de log')
	xmlpaths = glob.glob(os.path.join(path,'*pro-lot.xml'))
	xmlpaths.sort(key=os.path.getctime)

	if len(xmlpaths) == 0:
		print('Nenhum arquivo de log \'*pro-lot.xml\' encontrado em: '+path)
		return

	# SELECIONA O NUMERO DE TODAS AS VENDAS NÃO TRANSMITIDAS
	with con.cursor() as cur:
		cur.execute("SELECT coo FROM ecf_venda_cabecalho WHERE cstat=0")
		res = [r[0] for r in cur.fetchall()]

	print('Procurando por logs de duplicidade de {} vendas'.format(len(res)))
	if len(res) == 0:
		print('Nenhuma venda pendente encontrada na base de dados')

	vendas_com_duplicidade = 0
	vendas_alteradas = 0

	for xmlpath in xmlpaths:
		xmlstring = None
		with open(xmlpath, 'r') as f:
			xmlstring = ''.join(f.readlines())
		try:	
			xmlstring.index('Duplicidade')
			vendas_com_duplicidade += 1
			try:
				index_start = xmlstring.index('[chNFe:')+len('[chNFe:')
			except ValueError:
				index_start = xmlstring.index('<chNFe>')+len('<chNFe>')
			index_end = index_start+44
			chave = xmlstring[index_start:index_end]
			serie = int(chave[22:25])
			numero = int(chave[25:34])

			if numero in res:
				with con.cursor() as cur:
					cur.execute('UPDATE ecf_venda_cabecalho SET chave_nfce_sat=%s WHERE coo=%s', (chave, numero))
					con.commit()
				vendas_alteradas += 1
				print('numero {}, serie {}, chave: {}'.format(numero, serie, chave))

		except ValueError:
			continue		
		
	print('{} chaves alteradas.'.format(vendas_alteradas))

	con.close()


if __name__=='__main__':
	main()
