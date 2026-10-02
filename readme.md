# 🎮 Video Game Sales - Data Pre-Processing

Este repositório contém o script inicial de análise e pré-processamento de dados para o projeto prático da disciplina de **Visualização de Dados** (UTFPR). 

O objetivo deste script é baixar, explorar e limpar o dataset [Video Game Sales and Industry Data (1980-2024)](https://www.kaggle.com/datasets/bhushandivekar/video-game-sales-and-industry-data-1980-2024), preparando-o para a criação das visualizações nas próximas entregas.

## O que o script faz?

1. **Download Automático:** Utiliza a biblioteca `kagglehub` para baixar os arquivos CSV brutos e limpos diretamente do Kaggle, criando a pasta `./files` automaticamente (caso não exista).
2. **Análise Exploratória de Dados (EDA):** Exibe as dimensões do dataset, estatísticas descritivas básicas e mapeia a quantidade de valores faltantes (nulos).
3. **Pré-processamento Customizado:**
   - Remove jogos que não possuem dados de vendas totais (`total_sales`) ou data de lançamento (`release_date`).
   - Preenche desenvolvedoras não registradas (`developer`) com a string `'Unknown'`.
   - **Diferencial:** Mantém as colunas de vendas regionais (`na_sales`, `jp_sales`, etc.), substituindo valores nulos por `0`, permitindo análises geográficas futuras (uma vantagem em relação ao dataset limpo oficial que exclui essas colunas).
4. **Validação:** Compara as dimensões e colunas do nosso dataset filtrado com o dataset limpo fornecido pelo autor no Kaggle.

## Como executar

### Pré-requisitos
Certifique-se de ter o Python instalado. Instale as bibliotecas necessárias utilizando o `pip`:

```bash
pip install pandas kagglehub
```

### No diretório raiz execute:
```bash
python .\processamento.py    
```
