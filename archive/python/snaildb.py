import json
import sys
import os

def version():
        print("SnailDB Version is 1.2v","running on this python version",sys.version_info.major,".",sys.version_info.minor)

class SnailDB:
    def __init__(self, file_path , db_name):
        self.file_path = file_path
        self.data = self._load_data()
        self.db_name = db_name
    

    def _load_data(self):
        try:
            with open(self.file_path, 'r') as file:
                data = json.load(file)
            return data
        except FileNotFoundError:
            return {}

    def _save_data(self):
        try:
            with open(self.file_path, 'w') as file:
                json.dump(self.data, file, indent=2)
        except Exception as e:
            print(f"Error saving data: {e}")


## fuctions
    def get_db_name(self):
        return self.db_name
    
    def drop(self):
        try:
            os.remove(self.file_path)
            print(f"database '{self.db_name}' and associated JSON file deleted.")
        except FileNotFoundError:
            print(f"database '{self.db_name}' does not exist")
        except Exception as e:
            print(f"Error deleting database: {e}")

    def insert_all(self,*documents):
        try:
            for doc in documents:
                key = doc.get("key")

                if key is None:
                    raise ValueError("Each document must have a 'key' field")

                if key in self.data:
                    raise ValueError(f"Key '{key}' already exists in the database.")

                self.data[key] = doc
            self._save_data()
        except Exception as e:
            print(f"Error inserting data: {e}")    

    def query(self,field_name,operator,target_value,limt=None,skip=None,pretty=False):
        try:
            results = []
            for key, entry in self.data.items():
                field_value = entry.get(field_name)

                if field_value is not None:
                    if operator == "=" and field_value == target_value:
                        results.append((key,entry))
                    elif operator == ">" and field_value > target_value:
                        results.append((key,entry))
                    elif operator == "<" and field_value < target_value:
                        results.append((key,entry))
                    elif operator == ">=" and field_value >= target_value:
                        results.append((key,entry))
                    elif operator == "<=" and field_value <= target_value:
                        results.append((key,entry))
                    elif operator == "!=" and field_value != target_value:
                        results.append((key,entry))

            if skip is not None:
                results = results[skip:]

            if limt is not None:
                results =results[:limt]           

            return json.dumps(results,indent=2) if pretty else results
        except Exception as e :
            print(f"Error querying data:{e}")
            return None
    
            ###
        
    def insert(self, document):
        try:
            key = document.get("key")
            if key is None :
                raise ValueError("Each document must'key' filds.")
            
            if key in self.data:
                raise ValueError(f"Key '{key}'already exists in the database.")

            self.data[key] = document

            self._save_data()
        except Exception as e:
            print(f"Error inserting data:{e}")
            
    def update(self, key, value):
        try:
            if key in self.data:
                self.data[key] = value
                self._save_data()
            else:
                raise ValueError(f"Key '{key}' not found in the database.")
        except Exception as e:
            print(f"Error updating data: {e}")

    def delete(self, key):
        try:
            if key in self.data:
                del self.data[key]
                self._save_data()
            else:
                raise ValueError(f"Key '{key}' not found in the database.")
        except Exception as e:
            print(f"Error deleting data: {e}")

    def get(self, key,pretty=False):
        try:
            return self.data[key]
        except KeyError:
            data = self.data[key]["data"]
            print(f"Key '{key}' not found in the database.") if pretty else data
            return None
        except Exception as e:
            print(f"Error retrieving data: {e}")
            return None

    def get_all(self,pretty=False):
        return json.dumps(self.data,indent=2) if pretty else self.data
