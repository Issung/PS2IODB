# Hacky JSON converters to export objects and lists with set prefixes and suffixes mixed in, which can then be string replaced in order to have that 
# entire object or list printed on a singular line. Useful for things like a very long vertex coordinates array.
import json

class SingleLineObject:
    """An object that gets serialised without newlines if serialised with CustomJSONEncoder"""
    object = None
    def __init__(self, object):
        self.object = object

    def __getitem__(self, key):
        return self.object[key]
    
    def __setitem__(self, key, value):
        self.object[key] = value

class SingleLineList:
    """A list that gets serialised without newlines if serialised with CustomJSONEncoder"""
    list = None
    def __init__(self, list):
        self.list = list
    
    def __len__(self):
        return len(self.list)
    
    def __getitem__(self, key):
        return self.list[key]
    
    def __setitem__(self, key, value):
        self.list[key] = value

class CustomJSONEncoder(json.JSONEncoder):
    """
        JSON Encoder that adds special wrapping characters for SingleLineObject/List.
        Remember to string replace the special sequences with empty strings.
    """
    def default(self, item):
        if isinstance(item, SingleLineObject):
            return "##<{}>##".format(item.object)
        if isinstance(item, SingleLineList):
            return "##<{}>##".format(item.list)