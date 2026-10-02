import pandas as pd
import kagglehub
import os

def is_directory_empty(path):
    # Returns True if the directory is empty, False otherwise
    with os.scandir(path) as it:
        return not any(it)
      
files_path = "./files"
force_download = False # Set to True if you want to force the download of the dataset even if it already exists

if(not os.path.exists(files_path)):
  os.makedirs(files_path)

if os.path.exists(files_path) and os.path.isdir(files_path):
    if is_directory_empty(files_path) or force_download:
        path = kagglehub.dataset_download(
          "bhushandivekar/video-game-sales-and-industry-data-1980-2024",
          output_dir=files_path,
          force_download=force_download
        )

        print("Path to dataset files:", path)
    else:
        print("Dataset files already exist in the directory. Skipping download.")
 
# Read the raw dataset CSV
df_raw = pd.read_csv('./files/Video Games Sales (1980-2024) - Raw.csv')

rows, cols = df_raw.shape
print(f"Number of rows: {rows}, Number of columns: {cols}")

print("DataFrame description:")
print(df_raw.describe())

print("Missing values per column:")
print(df_raw.isna().sum())

# Quantity of games without registered sales
print("No total_sales:", df_raw['total_sales'].isnull().sum())

# Quantity of games without a release date
print("No release_date:", df_raw['release_date'].isnull().sum())

# Quantity of games without a registered developer
print("No developer:", df_raw['developer'].isnull().sum())

# ---------- PRE-PROCESSING ----------

# The chosen datased already has a cleaned version available.
# The goal of the below section (pre-processing) is to understand 
# what kind of data cleaning was used.

# With the next lines of code we can achieve almost the same result as the cleaned dataset, 
# but we want to still have the sales per region columns that the original cleaned dataset removed. 

# Quantity remaining after removing nulls from these two columns
df_filtered = df_raw.dropna(subset=['total_sales', 'release_date'])
print("Remaining rows after filtering sales and dates:", len(df_filtered))

# Fill missing values in the 'developer' column with 'Unknown'
df_filtered['developer'] = df_filtered['developer'].fillna('Unknown')

#-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=
# Fill missing values in the regional sales columns with 0
regional_cols = ['na_sales', 'jp_sales', 'pal_sales', 'other_sales'] # TODO:
df_filtered[regional_cols] = df_filtered[regional_cols].fillna(0)    # Ask our professor if this is reasonable
#-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=-=-=-=-=--=-=-=

# Comparision with the original cleaned dataset
print("\nComparing with the cleaned dataset:")
df_cleaned = pd.read_csv('./files/Video_Games_Sales_Cleaned.csv')



print("\n----- DIMENSIONS -----")
print(f"Remaining rows in Raw original:   {df_raw.shape[0]}")
print(f"Remaining rows in Raw filtered:   {df_filtered.shape[0]}")
print(f"Remaining rows in Cleaned oficial: {df_cleaned.shape[0]}")

print(f"Difference (Filtered vs Cleaned): {len(df_filtered) - len(df_cleaned)} lines")

print("\n------ COLUMNS ------")
print(f"Remaining columns in Raw:     {df_raw.shape[1]}")
print(f"Remaining columns in Filtered: {df_filtered.shape[1]}")
print(f"Remaining columns in Cleaned: {df_cleaned.shape[1]}")

print(f"Remaining columns in Raw:     {df_raw.columns.tolist()}")
print(f"Remaining columns in Filtered: {df_filtered.columns.tolist()}")
print(f"Remaining columns in Cleaned: {df_cleaned.columns.tolist()}")

removed_columns = set(df_filtered.columns) - set(df_cleaned.columns)
print(f"Columns removed in Cleaned: {list(removed_columns)}")


# Final check of out dataset after filtering and filling missing values
print("\n--- FINAL DATASET CHECK ---")
print("Missing values in our filtered dataset:")
print(df_filtered.isna().sum())