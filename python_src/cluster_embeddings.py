import matplotlib as plt
from sklearn import metrics, datasets
from sklearn.datasets import make_circles, make_blobs
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
import numpy as np

number_of_embeddings = 10
X, _ = make_circles(n_samples=number_of_embeddings, factor=.5)
